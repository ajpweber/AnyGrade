import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a document classification assistant. Respond ONLY with a raw JSON object — no prose, no markdown fences.`

const PROMPT = `Look at this student answer sheet and answer two questions:

1. Does it have a ZipGrade bubble section? (grid of A B C D E circles, black corner registration marks)
2. Does it have handwritten answers? (student wrote letters or text answers directly on the page)

Both can be true at once — a student may fill bubbles AND write answers.

Respond ONLY as JSON:
{ "isZipGrade": true, "hasHandwritten": false }`

export type DetectSheetResult = { isZipGrade: boolean; hasHandwritten: boolean }

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "file field required" }, { status: 400 })

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
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    temperature: 0,
    system: SYSTEM,
    messages: [userMessage],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim())
    return NextResponse.json({ isZipGrade: !!parsed.isZipGrade, hasHandwritten: !!parsed.hasHandwritten })
  } catch {
    return NextResponse.json({ isZipGrade: false, hasHandwritten: false })
  }
}
export const maxDuration = 300
