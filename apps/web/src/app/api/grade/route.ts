import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { GradeResult, GradeFileResult } from "./types"

export type { GradeResult, GradeFileResult }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = "You are a grading assistant. You MUST respond with a single raw JSON array only — no prose, no explanation, no markdown fences. Output starts with [ and ends with ]."

const PROMPT_TEMPLATE = `You are grading a student's handwritten solution sheet.

Problems to grade:
{PROBLEMS}

For each problem, find the boxed, circled, or underlined final answer that belongs to that problem label — ignore answer boxes for other problems.
Read each answer exactly as written: numbers, units, variables, and direction indicators.
Compare to the expected answer. Accept:
- Numbers within ~5% rounding difference
- Equivalent units: fps = ft/s, fps² = ft/s² = ft/sec² = ft·s⁻², m/s² = m·s⁻², kph = km/h, rpm = rev/min, and any other notation that is mathematically identical
- Equivalent notation (u_t vs ut, direction shown any way)
For multi-part expected answers (separated by ;), ALL parts must match.

Also record where you found the answer: the 1-based page number and the bounding box of the answer region (the boxed/circled/underlined area). Express x, y, w, h as fractions of that page's dimensions (0.0–1.0): x and y are the top-left corner, w and h are width and height.

Respond ONLY as a JSON array (no markdown, no fences):
[{"label":"1.301","read":"what you see","correct":true,"confidence":"high","bbox":{"page":1,"x":0.12,"y":0.45,"w":0.22,"h":0.04}},...]

If an answer box is not found or illegible, return "correct":null, note it in "read", and omit "bbox".`

function parseJSON(raw: string): Omit<GradeResult, "pts">[] { // bbox is optional and passed through
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = /(\[[\s\S]*\])/.exec(cleaned)
    if (m) {
      try { return JSON.parse(m[1]) } catch { /* fall through */ }
    }
    return []
  }
}

async function gradeFile(
  pdfBase64: string,
  mediaType: "application/pdf" | "image/jpeg" | "image/png",
  problems: { label: string; expected: string; pts: number }[],
): Promise<GradeResult[]> {
  const problemList = problems
    .map((p, i) => `${i + 1}. Problem "${p.label}" — expected answer: "${p.expected}"`)
    .join("\n")

  const prompt = PROMPT_TEMPLATE.replace("{PROBLEMS}", problemList)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaBlock: any = mediaType === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: pdfBase64 } }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: "user", content: [mediaBlock, { type: "text" as const, text: prompt }] }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const parsed = parseJSON(raw)

  // Attach pts from the problems definition (matched by label)
  const ptsMap = new Map(problems.map((p) => [p.label, p.pts]))
  return parsed.map((r) => ({ ...r, pts: ptsMap.get(r.label) ?? 1 }))
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const problemsRaw = form.get("problems") as string | null
  if (!problemsRaw) {
    return NextResponse.json({ error: "problems field required" }, { status: 400 })
  }

  let problems: { label: string; expected: string; pts: number }[]
  try {
    problems = JSON.parse(problemsRaw)
  } catch {
    return NextResponse.json({ error: "problems must be valid JSON" }, { status: 400 })
  }

  if (!problems.length) {
    return NextResponse.json({ error: "at least one problem required" }, { status: 400 })
  }

  const files = form.getAll("files") as File[]
  if (!files.length) {
    return NextResponse.json({ error: "at least one file required" }, { status: 400 })
  }

  const maxScore = problems.reduce((sum, p) => sum + p.pts, 0)
  const fileResults: GradeFileResult[] = []

  for (const file of files) {
    const buf = await file.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const mt = file.type === "application/pdf"
      ? "application/pdf"
      : file.type === "image/png"
      ? "image/png"
      : "image/jpeg"

    try {
      const results = await gradeFile(b64, mt as "application/pdf" | "image/jpeg" | "image/png", problems)
      const rawScore = results.reduce((sum, r) => sum + (r.correct === true ? r.pts : 0), 0)
      fileResults.push({ filename: file.name, results, rawScore, maxScore })
    } catch (err) {
      fileResults.push({
        filename: file.name,
        results: [],
        rawScore: 0,
        maxScore,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ fileResults })
}
