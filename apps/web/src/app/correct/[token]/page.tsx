import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { CorrectionClient } from "./CorrectionClient"
import type { GradeFileResult } from "@/app/api/grade/types"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function CorrectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: task, error } = await supabase
    .from("correction_tasks")
    .select("*")
    .eq("token", token)
    .single()

  if (error || !task) notFound()

  // Signed URL valid for 1 hour
  const { data: signed } = await supabase.storage
    .from("scans")
    .createSignedUrl(task.scan_path, 3600)

  if (!signed?.signedUrl) notFound()

  return (
    <CorrectionClient
      token={token}
      studentName={task.student_name}
      assessmentTitle={task.assessment_title}
      assessmentType={task.assessment_type}
      scanUrl={signed.signedUrl}
      gradeResult={task.grade_results as GradeFileResult}
      status={task.status}
    />
  )
}
