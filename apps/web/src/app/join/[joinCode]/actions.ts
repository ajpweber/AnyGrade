"use server"

import { createClient } from "@supabase/supabase-js"

type JoinArgs = {
  classId: string
  name: string
  email: string
}

export async function joinClass({ classId, name, email }: JoinArgs) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  // Check if this email is already registered in this class
  const { data: existing } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("class_id", classId)
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    // Already joined — update name in case they're re-registering
    await supabase
      .from("students")
      .update({ full_name: name })
      .eq("id", existing.id)
    return null // success
  }

  const { error } = await supabase.from("students").insert({
    class_id:  classId,
    full_name: name,
    email,
  })

  if (error) return { error: "Could not register. Please try again." }
  return null
}
