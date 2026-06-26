import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * Checks auth + rate limit in one call.
 * Returns the user object, or a NextResponse (401/429) on failure.
 * Usage:
 *   const auth = await requireAuth(req)
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

  // 30 Anthropic API calls per minute per teacher
  if (!checkRateLimit(user.id, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429 },
    )
  }

  return { id: user.id, email: user.email }
}
