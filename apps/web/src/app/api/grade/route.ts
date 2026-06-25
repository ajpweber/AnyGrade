import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = "You are a grading assistant. You MUST respond with a single raw JSON array only — no prose, no explanation, no markdown fences. Output starts with [ and ends with ]."

const PROMPT_TEMPLATE = `You are grading a student's handwritten solution sheet.

Problems to grade:
{PROBLEMS}

For each problem, find the boxed, circled, or underlined final answer that belongs to that problem label — ignore answer boxes for other problems.
Read each answer exactly as written: numbers, units, variables, and direction indicators.
Compare to the expected answer. Accept:
- Numbers within ~5% rounding difference
- Equivalent units (fps = ft/s, ft/sec² = ft/s²)
- Equivalent notation (u_t vs ut, direction shown any way)
For multi-part expected answers (separated by ;), ALL parts must match.

Respond ONLY as a JSON array (no markdown, no fences):
[{"label":"1.301","read":"what you see in the box","correct":true,"confidence":"high"},...]

If an answer box for a problem is not found or illegible, return "correct":null and note it in "read".`

export type GradeResult = {
  label: string
  read: string
  correct: boolean | null
  confidence: "high" | "medium" | "low" | "?"
}

export type GradeFileResult = {
  filename: string
  results: GradeResult[]
  error?: string
}

function parseJSON(raw: string): GradeResult[] {
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
  problems: { label: string; expected: string }[],
): Promise<GradeResult[]> {
  const problemList = problems
    .map((p, i) => `${i + 1}. Problem "${p.label}" — expected answer: "${p.expected}"`)
    .join("\n")

  const prompt = PROMPT_TEMPLATE.replace("{PROBLEMS}", problemList)

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: mediaType === "application/pdf" ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: pdfBase64 },
          } as Parameters<typeof client.messages.create>[0]["messages"][0]["content"][0],
          { type: "text", text: prompt },
        ],
      },
    ],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  return parseJSON(raw)
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

  let problems: { label: string; expected: string }[]
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
      fileResults.push({ filename: file.name, results })
    } catch (err) {
      fileResults.push({
        filename: file.name,
        results: [],
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ fileResults })
}
