import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"
import type { ExtractKeyResult } from "@/app/api/extract-key/route"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an answer key prediction assistant. You MUST respond with a single raw JSON object only — no prose, no markdown fences. Output starts with { and ends with }.`

const PROMPT = `This document contains multiple-choice or short-answer questions with no answer key.

Your task:
1. Extract each question number and the question text (truncated to ~80 chars if long).
2. Predict the correct answer for each question based on your knowledge of the subject matter. For MCQ, output the letter (A/B/C/D/E). For short answer, output a concise answer.
3. Number questions sequentially by their appearance in the document.

Respond ONLY as JSON:
{
  "hasAnswers": true,
  "sourceType": "composite",
  "items": [
    { "num": 1, "question": "What is the capital of France?", "answer": "A" },
    { "num": 2, "question": "Which gas is most abundant in Earth's atmosphere?", "answer": "C" }
  ],
  "warnings": ["Answers are AI-predicted — teacher review required before use."]
}`

function parseJSON(raw: string): ExtractKeyResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = /(\{[\s\S]*\})/.exec(cleaned)
    if (m) { try { return JSON.parse(m[1]) } catch { /* fall through */ } }
    return { hasAnswers: false, sourceType: "blank", questionNums: [], items: [], warnings: ["Failed to parse prediction response"] }
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "file field required" }, { status: 400 })
  }

  if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
    return NextResponse.json({ error: "DOCX not supported. Export to PDF first." }, { status: 422 })
  }

  const buf = await file.arrayBuffer()
  const b64 = Buffer.from(buf).toString("base64")
  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf")
  const mediaType = isPdf ? "application/pdf" : file.type === "image/png" ? "image/png" : "image/jpeg"

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
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM,
    messages: [userMessage],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const result = parseJSON(raw)
  return NextResponse.json(result)
}
