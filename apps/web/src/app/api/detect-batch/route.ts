import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PDFDocument } from "pdf-lib"


const SYSTEM = "You are a document parser. Respond with a single raw JSON object only — no prose, no markdown fences."

const PROMPT = `Look at this page from a scanned document. Find every student name written in the header area of this page — names are typically written as "Last, First MI" or "First Last" near the top.

Return JSON:
{ "names": ["Last, First MI", "Last, First MI"] }

If no name is found, return { "names": [] }.
If only one student name is found, return { "names": ["that name"] }.
Do not guess or infer — only return names explicitly written on the page.`

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

  // Extract only the first page to keep this call fast
  const srcDoc   = await PDFDocument.load(buf)
  const sampleDoc = await PDFDocument.create()
  const pagesToSample = Math.min(2, srcDoc.getPageCount())
  const copied   = await sampleDoc.copyPages(srcDoc, Array.from({ length: pagesToSample }, (_, i) => i))
  copied.forEach((p) => sampleDoc.addPage(p))
  const sampleBytes = await sampleDoc.save()
  const b64 = Buffer.from(sampleBytes).toString("base64")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001", // fast + cheap for sampling
    max_tokens: 256,
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

  const raw     = (response.content[0] as { text: string }).text.trim()
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()

  let names: string[] = []
  try {
    const parsed = JSON.parse(cleaned)
    names = Array.isArray(parsed.names) ? parsed.names : []
  } catch { /* return empty */ }

  return NextResponse.json({ isMultiStudent: names.length > 1, names })
}
