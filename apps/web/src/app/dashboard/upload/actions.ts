"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function uploadScans(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const classId = formData.get("class_id") as string
  const title = formData.get("title") as string
  const type = formData.get("type") as string
  const totalItems = formData.get("total_items") as string
  const files = formData.getAll("files") as File[]

  if (!files.length || !files[0].size) {
    redirect("/dashboard/upload?error=Please+select+at+least+one+scan")
  }

  // Create the assessment record first
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      class_id: classId || null,
      teacher_id: user.id,
      title,
      type: type || null,
      total_items: totalItems ? Number(totalItems) : null,
      conducted_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (assessmentError) {
    redirect(`/dashboard/upload?error=${encodeURIComponent(assessmentError.message)}`)
  }

  // Upload each scan image to storage
  const uploadErrors: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `${user.id}/${assessment.id}/${i + 1}.${ext}`

    const { error: storageError } = await supabase.storage
      .from("scans")
      .upload(path, file, { contentType: file.type, upsert: false })

    if (storageError) uploadErrors.push(storageError.message)
  }

  if (uploadErrors.length) {
    redirect(`/dashboard/upload?error=${encodeURIComponent(uploadErrors[0])}`)
  }

  redirect(`/dashboard/assessments/${assessment.id}`)
}

export async function getClasses() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("classes")
    .select("id, name, subject")
    .order("created_at", { ascending: false })
  return data ?? []
}
