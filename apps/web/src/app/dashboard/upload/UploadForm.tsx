"use client"

import { useRef, useState } from "react"
import { uploadScans } from "./actions"

type ClassRow = { id: string; name: string; subject: string | null }

export function UploadForm({
  classes,
  error,
}: {
  classes: ClassRow[]
  error?: string
}) {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const accepted = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    )
    setFiles((prev) => [...prev, ...accepted])
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <form action={uploadScans} className="space-y-5">
      {/* Class */}
      <div>
        <label htmlFor="class_id" className="block text-sm font-medium text-zinc-700 mb-1">
          Class
        </label>
        <select
          id="class_id"
          name="class_id"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">— No class selected —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.subject ? ` · ${c.subject}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-1">
          Assessment title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Quiz 3 – Kinematics"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      {/* Type + Total items */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-zinc-700 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="">—</option>
            <option value="quiz">Quiz</option>
            <option value="activity">Activity</option>
            <option value="seatwork">Seatwork</option>
            <option value="exam">Exam</option>
            <option value="long_exam">Long exam</option>
            <option value="lab_report">Lab report</option>
            <option value="recitation">Recitation</option>
            <option value="project">Project</option>
          </select>
        </div>

        <div>
          <label htmlFor="total_items" className="block text-sm font-medium text-zinc-700 mb-1">
            Total items
          </label>
          <input
            id="total_items"
            name="total_items"
            type="number"
            min="1"
            placeholder="e.g. 50"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* File drop zone */}
      <div>
        <p className="block text-sm font-medium text-zinc-700 mb-1">
          Scan files <span className="text-red-500">*</span>
        </p>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? "border-zinc-500 bg-zinc-100" : "border-zinc-300 hover:border-zinc-400"
          }`}
        >
          <p className="text-sm text-zinc-500">
            Drag & drop images or PDFs here, or{" "}
            <span className="font-medium text-zinc-900 underline underline-offset-2">browse</span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">JPG, PNG, HEIC, PDF accepted</p>
          <input
            ref={inputRef}
            type="file"
            name="files"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2">
                <span className="text-sm text-zinc-700 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-3 shrink-0 text-xs text-zinc-400 hover:text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={files.length === 0}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "scans"}
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
