import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { filename } = await req.json()
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 })

  const ext = filename.split(".").pop() ?? "pdf"
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from("batch-uploads")
    .createSignedUploadUrl(filePath)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    filePath,
  })
}
