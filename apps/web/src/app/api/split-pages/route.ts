import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 })

  const buf = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(buf)
  const totalPages = srcDoc.getPageCount()

  const students: { name: null; pdfBase64: string }[] = []

  for (let i = 0; i < totalPages; i++) {
    const dest = await PDFDocument.create()
    const [page] = await dest.copyPages(srcDoc, [i])
    dest.addPage(page)
    const bytes = await dest.save()
    students.push({ name: null, pdfBase64: Buffer.from(bytes).toString("base64") })
  }

  return NextResponse.json({ students, totalPages })
}
