import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { WorkspaceShell } from "./WorkspaceShell"
import type { ClassItem } from "./types"

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: rawClasses } = await supabase
    .from("classes")
    .select("id, name, school_syllabi ( subject_code, subject_title, topics )")
    .eq("teacher_id", user.id)
    .order("name")

  const classes: ClassItem[] = (rawClasses ?? []).map((c) => {
    const syl = Array.isArray(c.school_syllabi)
      ? c.school_syllabi[0]
      : c.school_syllabi
    return {
      id: c.id,
      name: c.name,
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
