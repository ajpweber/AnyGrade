import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 })

    const buf = await file.arrayBuffer()
    let srcDoc: PDFDocument
    try {
      srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
    } catch (e) {
      return NextResponse.json({ error: `pdf-lib failed to load PDF: ${String(e)}` }, { status: 500 })
    }

    const totalPages = srcDoc.getPageCount()
    if (totalPages === 0) return NextResponse.json({ error: "PDF has no pages" }, { status: 422 })

    const students: { name: null; pdfBase64: string }[] = []

    for (let i = 0; i < totalPages; i++) {
      const dest = await PDFDocument.create()
      const [page] = await dest.copyPages(srcDoc, [i])
      dest.addPage(page)
      const bytes = await dest.save()
      students.push({ name: null, pdfBase64: Buffer.from(bytes).toString("base64") })
    }

    return NextResponse.json({ students, totalPages })
  } catch (e) {
    return NextResponse.json({ error: `split-pages crashed: ${String(e)}` }, { status: 500 })
  }
}
