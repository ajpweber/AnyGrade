import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import type { GradeFileResult } from "@/app/api/grade/types"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type SendPayload = {
  assessmentTitle: string
  assessmentType: string
  students: {
    name: string | null
    email: string
    gradeResult: GradeFileResult
    pdfBase64: string // the student's scan slice
  }[]
}

export type SendResult = {
  email: string
  token: string
  error?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const body: SendPayload = await req.json()
  const { assessmentTitle, assessmentType, students } = body

  const results: SendResult[] = []

  for (const s of students) {
    try {
      // 1. Upload scan to Supabase Storage
      const scanBytes = Buffer.from(s.pdfBase64, "base64")
      const scanPath  = `${Date.now()}-${(s.name ?? "student").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      const { error: uploadError } = await supabase.storage
        .from("scans")
        .upload(scanPath, scanBytes, { contentType: "application/pdf", upsert: false })
      if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`)

      // 2. Create correction task record
      const { data: task, error: insertError } = await supabase
        .from("correction_tasks")
        .insert({
          student_name:     s.name,
          student_email:    s.email,
          assessment_title: assessmentTitle,
          assessment_type:  assessmentType,
          scan_path:        scanPath,
          grade_results:    s.gradeResult,
          status:           "pending",
        })
        .select("token")
        .single()
      if (insertError) throw new Error(`DB insert: ${insertError.message}`)

      const token = task.token as string
      const link  = `${BASE_URL}/correct/${token}`

      // 3. Send email
      const flaggedCount = s.gradeResult.results.filter(
        (r) => r.correct === false || r.correct === null,
      ).length

      const { error: sendError } = await resend.emails.send({
        from:    process.env.RESEND_FROM ?? "AnyGrade <onboarding@resend.dev>",
        to:      s.email,
        subject: `Your graded paper — ${assessmentTitle}`,
        html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
  <h2 style="margin-bottom:4px">Hi ${s.name ?? "Student"},</h2>
  <p style="color:#555;margin-top:0">Your <strong>${assessmentTitle}</strong> has been graded.</p>

  <div style="background:#f5f5f5;border-radius:10px;padding:20px 24px;margin:20px 0">
    <div style="font-size:28px;font-weight:700;color:#1a1a1a">${s.gradeResult.rawScore}/${s.gradeResult.maxScore}</div>
    <div style="font-size:13px;color:#666;margin-top:2px">${flaggedCount} item${flaggedCount !== 1 ? "s" : ""} need${flaggedCount === 1 ? "s" : ""} your attention</div>
  </div>

  ${flaggedCount > 0 ? `
  <p>Help improve AnyGrade's accuracy by confirming where your answers appear on your scan. It takes about a minute.</p>
  <a href="${link}" style="display:inline-block;background:#4DB832;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
    View &amp; confirm your paper →
  </a>
  <p style="font-size:11px;color:#aaa;margin-top:16px">This link is private to you. Do not share it.</p>
  ` : `
  <p style="color:#4DB832;font-weight:600">All answers were graded successfully — nothing to confirm.</p>
  `}
</div>`,
      })
      if (sendError) throw new Error(`Email send failed: ${sendError.message}`)

      results.push({ email: s.email, token })
    } catch (err) {
      results.push({
        email: s.email,
        token: "",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ results })
}
