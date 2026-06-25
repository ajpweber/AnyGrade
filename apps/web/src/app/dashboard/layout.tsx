import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/app/login/actions"

async function getPendingCount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase
    .from("correction_tasks")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "pending")
    .eq("status", "completed")
  return count ?? 0
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const pendingCorrections = await getPendingCount(supabase)

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-100">
          <span className="text-base font-semibold text-zinc-900">AnyGrade</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
          <a
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-zinc-700 hover:bg-zinc-100 font-medium"
          >
            Dashboard
          </a>
          <a
            href="/dashboard/classes"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-zinc-500 hover:bg-zinc-100"
          >
            Classes
          </a>
          <a
            href="/dashboard/assessments"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-zinc-500 hover:bg-zinc-100"
          >
            Assessments
          </a>
          <a
            href="/dashboard/upload"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-zinc-500 hover:bg-zinc-100"
          >
            Upload scans
          </a>
          <a
            href="/dashboard/corrections"
            className="flex items-center justify-between rounded-md px-3 py-2 text-zinc-500 hover:bg-zinc-100"
          >
            <span>Corrections</span>
            {pendingCorrections > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                {pendingCorrections}
              </span>
            )}
          </a>
        </nav>

        <div className="px-3 py-4 border-t border-zinc-100">
          <p className="px-3 text-xs text-zinc-400 truncate mb-2">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
