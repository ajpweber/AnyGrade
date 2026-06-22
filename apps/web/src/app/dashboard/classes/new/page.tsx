import { createClass } from "./actions"

export default async function NewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="px-8 py-8 max-w-lg">
      <div className="mb-6">
        <a href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-600">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">New class</h1>
      </div>

      <form action={createClass} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
            Class name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. BSEE 2-A"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-zinc-700 mb-1">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            placeholder="e.g. Engineering Dynamics"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="academic_year" className="block text-sm font-medium text-zinc-700 mb-1">
              Academic year
            </label>
            <input
              id="academic_year"
              name="academic_year"
              type="text"
              placeholder="e.g. 2025–2026"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="semester" className="block text-sm font-medium text-zinc-700 mb-1">
              Semester
            </label>
            <select
              id="semester"
              name="semester"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">—</option>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">Summer</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Create class
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
