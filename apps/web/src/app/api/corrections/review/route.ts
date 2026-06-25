import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { taskId, decisions } = await req.json() as {
    taskId: string
    decisions: Record<string, boolean>
  }

  if (!taskId || !decisions) {
    return NextResponse.json({ error: "taskId and decisions required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("correction_tasks")
    .update({
      review_status:  "reviewed",
      review_results: decisions,
      reviewed_at:    new Date().toISOString(),
      reviewed_by:    user.email,
    })
    .eq("id", taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
