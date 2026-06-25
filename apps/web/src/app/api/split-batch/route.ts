import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PDFDocument } from "pdf-lib"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 300

const SYSTEM = "You are a document parser. Respond with a single raw JSON array only — no prose, no markdown fences."

const PROMPT = `This PDF is a batch of student answer sheets scanned together.

Your task: identify exactly where each student's submission starts and ends.

Use BOTH signals together to determine boundaries:

1. HEADER DATA — Each student's first page typically has a printed or handwritten header with:
   - Student name (e.g. "Name & Section: Tom Carl L. Vargas")
   - Section/class code (e.g. "ME-1B", "BSME 2C")
   - Date, instructor, or other identifying fields
   A new header signals a new student.

2. HANDWRITING SIGNATURE — Compare the handwriting style across pages. Look at letter slant, stroke weight, character spacing, and overall pen personality. A clear shift in handwriting style confirms a new student even when headers are missing or unreadable.

When both signals agree, use them. When only one is available, use that one.

Return a JSON array — one entry per student, in the order they appear in the PDF:
[
  { "name": "Vargas, Tom Carl L.", "section": "ME-1B", "startPage": 1, "endPage": 3 },
  { "name": "Santos, Maria A.", "section": "ME-1B", "startPage": 4, "endPage": 6 }
]

Rules:
- "name" is the student's full name from the header, formatted Last, First MI — or null if unreadable
- "section" is the class/section code — or null if unreadable
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let buf: ArrayBuffer

  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    // Large file path: browser uploaded to Supabase, passes filePath (storage key)
    const { filePath } = await req.json() as { filePath: string }
    if (!filePath) return NextResponse.json({ error: "filePath required" }, { status: 400 })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: urlData, error: urlError } = await supabase.storage
      .from("batch-uploads")
      .createSignedUrl(filePath, 120)
    if (urlError || !urlData) return NextResponse.json({ error: `Storage URL error: ${urlError?.message}` }, { status: 500 })
    const fetchRes = await fetch(urlData.signedUrl)
    if (!fetchRes.ok) return NextResponse.json({ error: `Failed to fetch file from storage: ${fetchRes.status}` }, { status: 500 })
    buf = await fetchRes.arrayBuffer()
  } else {
    // Small file path: file sent directly as FormData
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file or fileUrl required" }, { status: 400 })
    buf = await file.arrayBuffer()
  }

  const b64 = Buffer.from(buf).toString("base64")

  // Step 1: Ask Claude to identify student boundaries
  let response
  try {
    response = await client.messages.create({
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
  } catch (e) {
    return NextResponse.json({ error: `Claude boundary detection failed: ${String(e)}` }, { status: 500 })
  }

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
    students.push({
      name:      seg.name,
      section:   seg.section,
      startPage: start,
      endPage:   end,
      pdfBase64: Buffer.from(sliceBytes).toString("base64"),
    })
  }

  return NextResponse.json({ students, totalPages })
}
