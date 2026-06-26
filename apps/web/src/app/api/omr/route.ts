import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an optical mark recognition (OMR) assistant reading a ZipGrade bubble answer sheet. Respond ONLY with a raw JSON object — no prose, no markdown fences. Output starts with { and ends with }.`

const PROMPT = `This is a scanned ZipGrade student answer sheet with 50 questions and 5 bubble choices per question (A, B, C, D, E).

Your task:
1. Identify every filled/darkened bubble. A filled bubble is clearly darker than the surrounding empty bubbles.
2. For each question (1–50), record the letter of the filled bubble.
3. If a question has no bubble filled, record null.
4. If a question has more than one bubble filled (double-mark), record all filled letters joined (e.g. "AB").
5. Ignore stray marks that don't clearly fill a bubble circle.

Also identify:
- The "Key Version" bubble (A, B, C, or D) if filled — this is in the small Key Version box in the upper-left area.
- Student ZipGrade ID digits if bubbles are filled in the ID grid — report as a string of digits.

Respond ONLY as JSON:
{
  "keyVersion": "A",
  "studentId": "12345",
  "answers": {
    "1": "B",
    "2": "C",
    "3": null,
    "4": "AB"
  },
  "warnings": ["Q3: no bubble filled", "Q4: double mark"]
}

Include every question number 1–50 in "answers", even if null.`

export type OmrResult = {
  keyVersion: string | null
  studentId: string | null
  answers: Record<string, string | null>
  warnings: string[]
}

function parseJSON(raw: string): OmrResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = /(\{[\s\S]*\})/.exec(cleaned)
    if (m) { try { return JSON.parse(m[1]) } catch { /* fall through */ } }
    return { keyVersion: null, studentId: null, answers: {}, warnings: ["Failed to parse OMR response"] }
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
  const mediaType = file.type === "image/png" ? "image/png" : "image/jpeg"

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
