import { getClasses } from "./actions"
import { UploadForm } from "./UploadForm"

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const classes = await getClasses()

  return (
    <div className="px-8 py-8 max-w-lg">
      <div className="mb-6">
        <a href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-600">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">Upload scans</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload photos or scans of answer sheets for grading.
        </p>
      </div>

      <UploadForm classes={classes} error={error} />
    </div>
  )
}
