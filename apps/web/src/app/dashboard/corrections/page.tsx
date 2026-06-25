import { createClient } from "@/lib/supabase/server"
import { CorrectionReviewClient } from "./CorrectionReviewClient"

export default async function CorrectionsPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from("correction_tasks")
    .select("id, student_name, assessment_title, completed_at, reading_corrections, corrected_bboxes, grade_result")
    .eq("review_status", "pending")
    .eq("status", "completed")
    .order("completed_at", { ascending: true })

  const tasks = (rows ?? []).map((row) => {
    const readingCorr: Record<string, string> = row.reading_corrections ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gradeResult: { results?: any[] } = row.grade_result ?? {}
    const results = gradeResult.results ?? []

    const items = results
      .filter((r) => r.label && readingCorr[r.label] !== undefined)
      .map((r) => ({
        label:      r.label as string,
        claudeRead: (r.read ?? "") as string,
        studentSays: readingCorr[r.label] as string,
        changed:    readingCorr[r.label] !== r.read,
      }))

    return {
      id:              row.id as string,
      studentName:     row.student_name as string | null,
      assessmentTitle: (row.assessment_title ?? "Assessment") as string,
      submittedAt:     (row.completed_at ?? "") as string,
      items,
    }
  })

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Correction review</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Review student corrections before grades are updated.{" "}
        {tasks.length > 0 && <span className="font-medium text-zinc-700">{tasks.length} pending.</span>}
      </p>
      <CorrectionReviewClient tasks={tasks} />
    </div>
  )
}
