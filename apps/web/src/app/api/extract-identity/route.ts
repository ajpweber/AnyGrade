import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"


const SYSTEM = "You are a document parser. Respond with a single raw JSON object only — no prose, no markdown fences."

const PROMPT = `Look at the header of this student answer sheet. Extract whatever identifying information is present.

Return ONLY this JSON object (no markdown, no explanation):
{
  "name": "full name as written, Last, First MI format if present, or null",
  "studentId": "student ID number if present, or null",
  "section": "section or class code (e.g. BSME 2C, ME-3A), or null",
  "date": "date if written, in ISO format YYYY-MM-DD if parseable, or the raw string, or null",
  "department": "department or course name if present, or null"
}

If a field is not visible or not present, use null. Do not guess or infer — only extract what is explicitly written.`

export type IdentityResult = {
  filename: string
  name: string | null
  studentId: string | null
  section: string | null
  date: string | null
  department: string | null
  error?: string
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
  }

  const form = await req.formData()
  const files = form.getAll("files") as File[]
  if (!files.length) {
    return NextResponse.json({ error: "at least one file required" }, { status: 400 })
  }

  const results: IdentityResult[] = []

  for (const file of files) {
    const buf = await file.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    const mediaType = isPdf ? "application/pdf"
      : file.type === "image/png" ? "image/png"
      : "image/jpeg"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediaBlock: any = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } }

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        temperature: 0,
        system: SYSTEM,
        messages: [{ role: "user", content: [mediaBlock, { type: "text", text: PROMPT }] }],
      })

      const raw = (response.content[0] as { text: string }).text.trim()
      const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()

      let parsed: Omit<IdentityResult, "filename"> = { name: null, studentId: null, section: null, date: null, department: null }
      try { parsed = JSON.parse(cleaned) } catch { /* leave nulls */ }

      results.push({ filename: file.name, ...parsed })
    } catch (err) {
      results.push({
        filename: file.name,
        name: null, studentId: null, section: null, date: null, department: null,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}
