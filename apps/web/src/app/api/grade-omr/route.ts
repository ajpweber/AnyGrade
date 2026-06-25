import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"
import type { GradeFileResult } from "@/app/api/grade/types"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an optical mark recognition (OMR) assistant reading a ZipGrade bubble answer sheet. Respond ONLY with a raw JSON object — no prose, no markdown fences. Output starts with { and ends with }.`

const PROMPT = `This is a scanned ZipGrade student answer sheet with bubble choices (A, B, C, D, E) per question.

Identify every filled/darkened bubble. A filled bubble is clearly darker than surrounding empty ones.

For each question number you can see, record the filled letter. If no bubble is filled, record null. If multiple bubbles are filled, record all letters joined (e.g. "AB").

Also check for a "Key Version" bubble (small box top-left) and Student ZipGrade ID digit bubbles.

Respond ONLY as JSON:
{
  "keyVersion": "A",
  "studentId": "12345",
  "answers": { "1": "B", "2": "C", "3": null },
  "warnings": []
}`

type OmrRaw = {
  keyVersion?: string | null
  studentId?: string | null
  answers: Record<string, string | null>
  warnings?: string[]
}

function parseOMR(raw: string): OmrRaw {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const m = /(\{[\s\S]*\})/.exec(cleaned)
  if (m) { try { return JSON.parse(m[1]) } catch { /* fall through */ } }
  return { answers: {}, warnings: ["Failed to parse OMR response"] }
}

async function omrSheet(b64: string, mediaType: "application/pdf" | "image/jpeg" | "image/png"): Promise<OmrRaw> {
  const userMessage: MessageParam = {
    role: "user",
    content: mediaType === "application/pdf"
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: PROMPT },
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
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

  return parseOMR((response.content[0] as { text: string }).text.trim())
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const problemsRaw = form.get("problems") as string | null
  if (!problemsRaw) return NextResponse.json({ error: "problems field required" }, { status: 400 })

  let problems: { label: string; expected: string; pts?: number }[]
  try { problems = JSON.parse(problemsRaw) }
  catch { return NextResponse.json({ error: "problems must be valid JSON" }, { status: 400 }) }

  const files = form.getAll("files") as File[]
  if (!files.length) return NextResponse.json({ error: "at least one file required" }, { status: 400 })

  const key: Record<string, string> = {}
  for (const p of problems) key[p.label] = p.expected.trim().toUpperCase()
  const maxScore = problems.reduce((sum, p) => sum + (p.pts ?? 1), 0)

  const fileResults: GradeFileResult[] = []

  for (const file of files) {
    const buf = await file.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const mt: "application/pdf" | "image/jpeg" | "image/png" =
      file.type === "application/pdf" ? "application/pdf"
      : file.type === "image/png" ? "image/png"
      : "image/jpeg"

    try {
      const omr = await omrSheet(b64, mt)
      const results = problems.map((p) => {
        const pts = p.pts ?? 1
        const studentAnswer = (omr.answers[p.label] ?? null)?.toUpperCase() ?? null
        const expected = key[p.label]
        const correct = studentAnswer === null ? null : studentAnswer === expected
        return { label: p.label, read: studentAnswer ?? "(blank)", correct, confidence: "high" as const, pts }
      })
      const rawScore = results.reduce((sum, r) => sum + (r.correct === true ? r.pts : 0), 0)
      const warnings = omr.warnings ?? []
      fileResults.push({
        filename: file.name,
        results,
        rawScore,
        maxScore,
        ...(warnings.length ? { error: warnings.join("; ") } : {}),
      })
    } catch (err) {
      fileResults.push({ filename: file.name, results: [], rawScore: 0, maxScore, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  return NextResponse.json({ fileResults })
}
