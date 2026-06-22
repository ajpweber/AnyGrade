import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cls }, { data: students }, { data: assessments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, name, subject, semester, academic_year")
        .eq("id", id)
        .single(),
      supabase
        .from("students")
        .select("id, full_name, student_id, email, phone_number")
        .eq("class_id", id)
        .order("full_name"),
      supabase
        .from("assessments")
        .select("id, title, type, conducted_at, total_items, max_score")
        .eq("class_id", id)
        .order("conducted_at", { ascending: false }),
    ])

  if (!cls) notFound()

  const meta = [
    cls.subject,
    cls.academic_year,
    cls.semester ? `Semester ${cls.semester}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-600">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">{cls.name}</h1>
        {meta && <p className="mt-0.5 text-sm text-zinc-500">{meta}</p>}
      </div>

      {/* Students */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Students{students && students.length > 0 ? ` (${students.length})` : ""}
          </h2>
          <a
            href={`/dashboard/classes/${id}/students/new`}
            className="text-xs text-zinc-500 hover:text-zinc-900"
          >
            + Add student
          </a>
        </div>

        {!students || students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center">
            <p className="text-sm text-zinc-500">No students yet.</p>
            <a
              href={`/dashboard/classes/${id}/students/new`}
              className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-2"
            >
              Add your first student
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Student ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 hidden sm:table-cell">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium text-zinc-900">{s.full_name}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{s.student_id ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-400 hidden sm:table-cell">{s.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Assessments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Assessments{assessments && assessments.length > 0 ? ` (${assessments.length})` : ""}
          </h2>
          <a
            href={`/dashboard/upload?class_id=${id}`}
            className="text-xs text-zinc-500 hover:text-zinc-900"
          >
            + Upload scan
          </a>
        </div>

        {!assessments || assessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center">
            <p className="text-sm text-zinc-500">No assessments yet.</p>
            <a
              href={`/dashboard/upload?class_id=${id}`}
              className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-2"
            >
              Upload your first scan
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {assessments.map((a) => (
              <a
                key={a.id}
                href={`/dashboard/assessments/${a.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                  {a.type && (
                    <p className="text-xs text-zinc-400 mt-0.5 capitalize">
                      {a.type.replace("_", " ")}
                    </p>
                  )}
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
                  <p className="text-xs text-zinc-400">
                    {a.total_items} items · {a.max_score} pts
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
