import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Returns the authenticated user, or a 401 NextResponse if not signed in.
 * Usage:
 *   const auth = await requireAuth()
 *   if (auth instanceof NextResponse) return auth
 */
export async function requireAuth(
  _req?: NextRequest,
): Promise<{ id: string; email: string | undefined } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return { id: user.id, email: user.email }
}
