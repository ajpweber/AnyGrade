"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function createClass(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const name = formData.get("name") as string
  const subject = formData.get("subject") as string | null
  const semester = formData.get("semester") as string | null
  const academic_year = formData.get("academic_year") as string | null

  const { data, error } = await supabase
    .from("classes")
    .insert({
      teacher_id: user.id,
      name,
      subject: subject || null,
      semester: semester || null,
      academic_year: academic_year || null,
    })
    .select("id")
    .single()

  if (error) {
    redirect(`/dashboard/classes/new?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/dashboard/classes/${data.id}`)
}
