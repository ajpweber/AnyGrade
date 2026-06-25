import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WorkspaceShell } from "./WorkspaceShell"
import type { ClassItem } from "./types"

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawClasses } = await (supabase as any)
    .from("classes")
    .select("id, name, join_code, school_syllabi ( subject_code, subject_title, topics )")
    .eq("teacher_id", user.id)
    .order("name") as { data: { id: string; name: string; join_code: string | null; school_syllabi: { subject_code: string; subject_title: string; topics: string[] } | { subject_code: string; subject_title: string; topics: string[] }[] | null }[] | null }

  const classes: ClassItem[] = (rawClasses ?? []).map((c) => {
    const syl = Array.isArray(c.school_syllabi)
      ? c.school_syllabi[0]
      : c.school_syllabi
    return {
      id: c.id,
      name: c.name,
      joinCode: c.join_code ?? null,
      syllabus: syl
        ? {
            subject_code: syl.subject_code,
            subject_title: syl.subject_title,
            topics: Array.isArray(syl.topics)
              ? (syl.topics as string[])
              : [],
          }
        : null,
    }
  })

  return <WorkspaceShell classes={classes} userEmail={user.email ?? ""} />
}
