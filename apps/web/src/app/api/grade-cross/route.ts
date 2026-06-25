import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages"
import type { GradeResult, GradeFileResult } from "@/app/api/grade/types"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── OMR (bubble read) ──────────────────────────────────────────────────────
const OMR_SYSTEM = `You are an OMR assistant. Respond ONLY with raw JSON — no prose, no fences.`
const OMR_PROMPT = `Read every filled bubble on this ZipGrade answer sheet. For each question number, record the filled letter (A–E). If blank, record null. If multiple filled, join them (e.g. "AB").
Respond ONLY as JSON: { "answers": { "1": "B", "2": null } }`

// ── Handwritten read ───────────────────────────────────────────────────────
const HW_SYSTEM = `You are a handwritten answer reader. Respond ONLY with raw JSON — no prose, no fences.`
const HW_PROMPT = `Read every handwritten answer on this sheet. For each question number you can find, record what the student wrote. If a question has no written answer, record null.
Respond ONLY as JSON: { "answers": { "1": "B", "2": "photosynthesis" } }`

type RawAnswers = Record<string, string | null>

async function readAnswers(b64: string, mediaType: "application/pdf" | "image/jpeg" | "image/png", system: string, prompt: string): Promise<RawAnswers> {
  const content: MessageParam["content"] = mediaType === "application/pdf"
    ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }, { type: "text", text: prompt }]
    : [{ type: "image", source: { type: "base64", media_type: mediaType, data: b64 } }, { type: "text", text: prompt }]

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    system,
    messages: [{ role: "user", content }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()
    return JSON.parse(cleaned).answers ?? {}
  } catch {
    return {}
  }
}

function reconcile(
  omr: RawAnswers,
  hw: RawAnswers,
  problems: { label: string; expected: string; pts?: number }[],
): { results: GradeResult[]; needsManual: string[] } {
  const needsManual: string[] = []
  const results: GradeResult[] = problems.map((p) => {
    const pts = p.pts ?? 1
    const bubble = (omr[p.label] ?? null)?.toUpperCase() ?? null
    const written = (hw[p.label] ?? null)?.toUpperCase() ?? null
    const expected = p.expected.trim().toUpperCase()

    // Both null → unreadable
    if (bubble === null && written === null) {
      needsManual.push(p.label)
      return { label: p.label, read: "(unreadable)", correct: null, confidence: "?", pts }
    }

    // Only bubble
    if (bubble !== null && written === null) {
      return { label: p.label, read: bubble, correct: bubble === expected, confidence: "high", pts }
    }

    // Only handwritten
    if (bubble === null && written !== null) {
      return { label: p.label, read: written, correct: written === expected, confidence: "medium", pts }
    }

    // Both present — ZipGrade is primary
    if (bubble === written) {
      return { label: p.label, read: bubble!, correct: bubble === expected, confidence: "high", pts }
    }

    // Conflict — flag it, use bubble as primary but mark low confidence
    return {
      label: p.label,
      read: `bubble:${bubble} written:${written}`,
      correct: bubble === expected ? true : null,
      confidence: "low",
      pts,
    }
  })

  return { results, needsManual }
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

  const maxScore = problems.reduce((sum, p) => sum + (p.pts ?? 1), 0)
  const fileResults: (GradeFileResult & { needsManual?: string[] })[] = []

  for (const file of files) {
    const buf = await file.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const mt: "application/pdf" | "image/jpeg" | "image/png" =
      file.type === "application/pdf" ? "application/pdf"
      : file.type === "image/png" ? "image/png"
      : "image/jpeg"

    try {
      const [omr, hw] = await Promise.all([
        readAnswers(b64, mt, OMR_SYSTEM, OMR_PROMPT),
        readAnswers(b64, mt, HW_SYSTEM, HW_PROMPT),
      ])
      const { results, needsManual } = reconcile(omr, hw, problems)
      const rawScore = results.reduce((sum, r) => sum + (r.correct === true ? r.pts : 0), 0)
      fileResults.push({ filename: file.name, results, rawScore, maxScore, ...(needsManual.length ? { needsManual } : {}) })
    } catch (err) {
      fileResults.push({ filename: file.name, results: [], rawScore: 0, maxScore, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  return NextResponse.json({ fileResults })
}
