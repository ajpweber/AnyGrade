import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PDFDocument } from "pdf-lib"


const SYSTEM = "You are a document parser. Respond with a single raw JSON array only — no prose, no markdown fences."

const PROMPT = `This PDF is a batch of student answer sheets scanned together, possibly in disorder (no guaranteed ordering by student).

Your task: identify exactly where each student's submission starts and ends.

PRIMARY method — handwriting signature:
Compare the handwriting style on each page against adjacent pages. Look at letter slant, stroke weight, character spacing, and overall pen personality. A clear shift in handwriting style signals a new student, even if there is no header.

FALLBACK method — name in header:
If a page has a student name written in the header area, use it to confirm or correct the boundary you found by handwriting.

Return a JSON array — one entry per student, in the order they appear in the PDF:
[
  { "name": "Last, First MI", "section": "BSME 2C", "startPage": 1, "endPage": 3 },
  { "name": "Last, First MI", "section": "BSME 2C", "startPage": 4, "endPage": 6 }
]

Rules:
- Use handwriting style change as the primary boundary signal
- "name" is from the header if present, or null if no header is readable
- "section" is the class/section code, or null
- "startPage" and "endPage" are 1-based
- Every page must belong to exactly one student — no gaps, no overlaps`

export type SplitStudent = {
  name: string | null
  section: string | null
  startPage: number
  endPage: number
  pdfBase64: string
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 })

  const buf = await file.arrayBuffer()

  // Guard against large PDFs that push context into the 1M-token tier
  const pageCheckDoc = await PDFDocument.load(buf)
  const pageCount = pageCheckDoc.getPageCount()
  if (pageCount > 9) {
    return NextResponse.json(
      { error: `Batch PDF has ${pageCount} pages. Please split it into chunks of 9 pages or fewer and upload each chunk separately.` },
      { status: 422 },
    )
  }

  const b64 = Buffer.from(buf).toString("base64")

  // Step 1: Ask Claude to detect page ranges per student
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: PROMPT },
      ],
    }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()

  let segments: { name: string | null; section: string | null; startPage: number; endPage: number }[]
  try {
    segments = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: "Claude returned unparseable split data", raw }, { status: 500 })
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: "No student segments detected", raw }, { status: 422 })
  }

  // Step 2: Slice the PDF into per-student PDFs using pdf-lib
  const srcDoc = await PDFDocument.load(buf)
  const totalPages = srcDoc.getPageCount()

  const students: SplitStudent[] = []

  for (const seg of segments) {
    const start = Math.max(1, seg.startPage)
    const end   = Math.min(totalPages, seg.endPage)
    if (start > end) continue

    const dest = await PDFDocument.create()
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)
    const copied = await dest.copyPages(srcDoc, indices)
    copied.forEach((p) => dest.addPage(p))

    const sliceBytes = await dest.save()
    const sliceB64   = Buffer.from(sliceBytes).toString("base64")

    students.push({
      name:      seg.name,
      section:   seg.section,
      startPage: start,
      endPage:   end,
      pdfBase64: sliceB64,
    })
  }

  return NextResponse.json({ students, totalPages })
}
export const maxDuration = 300
