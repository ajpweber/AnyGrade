import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an answer key extraction assistant. You MUST respond with a single raw JSON object only — no prose, no markdown fences. Output starts with { and ends with }.`

const PROMPT = `Analyze this document and extract the answer key.

The document may be one of:
1. A composite questionnaire with the answer key embedded (last page table, bold/italic answers, handwritten fills)
2. A standalone answer key (numbered list, table, or grid)
3. A blank form with no answers

Your task:
- Find all question-answer pairs. For MCQ, the answer is a letter (A/B/C/D/E). For worded/problem-solving, extract the full answer or solution.
- If the answer key is in a multi-column table (e.g., # | Answer columns, possibly repeated side-by-side), parse all columns.
- If answers are embedded as bold/italic text within the question options, identify the marked option.
- If a teacher filled in handwritten answers on a printed form, read them.
- Number questions sequentially. If you detect a numbering error in the source (e.g., "16." appearing where "18." is expected based on sequence), flag it but use the sequential position as the true number.

Respond ONLY as JSON:
{
  "hasAnswers": true,
  "sourceType": "composite" | "key-only" | "blank",
  "questionNums": [1, 2, 3, 4, 5],
  "items": [
    { "num": 1, "answer": "B" },
    { "num": 2, "answer": "B" }
  ],
  "warnings": ["Q18 is labeled '16.' in the source document — treated as #18 based on sequence"]
}

Always populate "questionNums" with every question number found in the document, even if hasAnswers is false. If no questions are found at all, set questionNums to [].`

export type ExtractKeyItem = { num: number; question?: string; answer: string }

export type ExtractKeyResult = {
  hasAnswers: boolean
  sourceType: "composite" | "key-only" | "blank"
  questionNums: number[]
  items: ExtractKeyItem[]
  warnings: string[]
}

function parseJSON(raw: string): ExtractKeyResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = /(\{[\s\S]*\})/.exec(cleaned)
    if (m) {
      try { return JSON.parse(m[1]) } catch { /* fall through */ }
    }
    return { hasAnswers: false, sourceType: "blank", questionNums: [], items: [], warnings: ["Failed to parse extraction response"] }
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "file field required" }, { status: 400 })
  }

  const buf = await file.arrayBuffer()
  const b64 = Buffer.from(buf).toString("base64")

  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf")
  const isPng = file.type === "image/png"
  const mediaType = isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg"

  // DOCX: not directly supported as vision input — return a clear error for now
  if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
    return NextResponse.json({
      error: "DOCX extraction is not yet supported via this route. Please export to PDF first, or use File Upload with a PDF."
    }, { status: 422 })
  }

  const userMessage: MessageParam = {
    role: "user",
    content: isPdf
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: PROMPT },
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png", data: b64 } },
          { type: "text", text: PROMPT },
        ],
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    system: SYSTEM,
    messages: [userMessage],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const result = parseJSON(raw)
  return NextResponse.json(result)
}
export const maxDuration = 300
