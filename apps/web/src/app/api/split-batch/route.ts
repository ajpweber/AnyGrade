import { requireAuth } from "@/lib/require-auth"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

export type SplitStudent = {
  name: string | null
  section: string | null
  startPage: number
  endPage: number
  pdfBase64: string
}

const RAILWAY_API = process.env.RAILWAY_API_URL

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  if (!RAILWAY_API) {
    return NextResponse.json({ error: "RAILWAY_API_URL not configured" }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(`${RAILWAY_API}/split-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.detail ?? "Railway split-batch failed" }, { status: res.status })
  }

  return NextResponse.json(data)
}
