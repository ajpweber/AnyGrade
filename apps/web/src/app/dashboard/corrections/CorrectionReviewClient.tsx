"use client"

import { useState } from "react"

type Item = {
  label: string
  claudeRead: string
  studentSays: string
  changed: boolean
}

type Task = {
  id: string
  studentName: string | null
  assessmentTitle: string
  submittedAt: string
  items: Item[]
}

export function CorrectionReviewClient({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks]       = useState(initial)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [decisions, setDecisions] = useState<Record<string, Record<string, boolean>>>({})
  const [saving, setSaving]     = useState<string | null>(null)

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function decide(taskId: string, label: string, value: boolean) {
    setDecisions((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? {}), [label]: value },
    }))
  }

  async function saveReview(taskId: string) {
    setSaving(taskId)
    await fetch("/api/corrections/review", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ taskId, decisions: decisions[taskId] ?? {} }),
    })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSaving(null)
  }

  const pending = tasks.length

  if (pending === 0) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-sm font-medium text-zinc-700">All caught up</p>
        <p className="text-xs text-zinc-400 mt-1">No pending corrections to review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const dec    = decisions[task.id] ?? {}
        const total  = task.items.length
        const decided = Object.keys(dec).length
        const allDone = decided >= total
        const isOpen  = expanded[task.id] ?? false

        return (
          <div key={task.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggle(task.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{task.studentName ?? "Student"}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {task.assessmentTitle} · {new Date(task.submittedAt).toLocaleString()} · {total} item{total !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-xs text-zinc-400">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <>
                {task.items.map((item) => {
                  const approved = dec[item.label] === true
                  const rejected = dec[item.label] === false
                  return (
                    <div key={item.label} className="flex gap-3 items-start px-4 py-3 border-t border-zinc-100">
                      <span className="text-xs font-medium text-zinc-400 min-w-[48px] pt-0.5">{item.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-400 tracking-wide mb-1">Claude read</p>
                        <p className="text-xs font-mono bg-zinc-50 rounded px-2 py-1.5 text-zinc-500 mb-2 break-all">{item.claudeRead}</p>
                        <p className="text-[10px] text-zinc-400 tracking-wide mb-1">
                          Student says{item.changed && (
                            <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">changed</span>
                          )}
                        </p>
                        <p className={`text-xs font-mono rounded px-2 py-1.5 break-all ${item.changed ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-500"}`}>
                          {item.studentSays}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => decide(task.id, item.label, true)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            approved
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decide(task.id, item.label, false)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            rejected
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 bg-zinc-50">
                  <span className="text-xs text-zinc-400">
                    {allDone ? "All items decided" : `${total - decided} item${total - decided !== 1 ? "s" : ""} need a decision`}
                  </span>
                  <button
                    disabled={!allDone || saving === task.id}
                    onClick={() => saveReview(task.id)}
                    className="text-xs font-medium px-4 py-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-30 disabled:cursor-default"
                  >
                    {saving === task.id ? "Saving…" : "Save review"}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
