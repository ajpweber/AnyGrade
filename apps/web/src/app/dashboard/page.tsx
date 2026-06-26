import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: classes }, { data: recentAssessments }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, subject, semester, academic_year")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("assessments")
      .select("id, title, type, conducted_at, total_items, classes(name)")
      .order("conducted_at", { ascending: false })
      .limit(5),
  ])

  const firstName = user?.email?.split("@")[0] ?? "Teacher"

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Here&apos;s what&apos;s happening with your classes.
        </p>
      </div>

      {/* Classes */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Classes
          </h2>
          <Link href="/dashboard/classes/new" className="text-xs text-zinc-500 hover:text-zinc-900">
            + Add class
          </Link>
        </div>

        {!classes || classes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">No classes yet.</p>
            <Link
              href="/dashboard/classes/new"
              className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-2"
            >
              Create your first class
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/dashboard/classes/${cls.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-4 hover:border-zinc-400 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900 truncate">{cls.name}</p>
                {cls.subject && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{cls.subject}</p>
                )}
                {(cls.academic_year || cls.semester) && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {[cls.academic_year, cls.semester ? `Sem ${cls.semester}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent assessments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Recent assessments
          </h2>
          <Link href="/dashboard/assessments" className="text-xs text-zinc-500 hover:text-zinc-900">
            View all
          </Link>
        </div>

        {!recentAssessments || recentAssessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-zinc-500">No assessments yet.</p>
            <Link
              href="/dashboard/upload"
              className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-2"
            >
              Upload your first scan
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {recentAssessments.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/assessments/${a.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {(a.classes as { name: string } | null)?.name}
                    {a.type && ` · ${a.type.replace("_", " ")}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {a.conducted_at && (
                    <p className="text-xs text-zinc-400">
                      {new Date(a.conducted_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400">{a.total_items} items</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
