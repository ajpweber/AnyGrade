"use client"

import { signOut } from "@/app/login/actions"
import type { ClassItem, Mode, Syllabus } from "./types"

function QuizIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5z" />
      <path d="M14.2 5.3l1-1a.7.7 0 0 1 1 0l1 1a.7.7 0 0 1 0 1l-1 1-2-2z" />
    </svg>
  )
}

function GradeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  )
}

function SubjectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17h2v-6H3v6zm4 0h2V8H7v9zm4 0h2V5h-2v12z" />
    </svg>
  )
}

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "quiz",    label: "AnyTest",    icon: <QuizIcon /> },
  { id: "grade",   label: "AnyGrade",   icon: <GradeIcon /> },
  { id: "subject", label: "AnySubject", icon: <SubjectIcon /> },
]

type Props = {
  mode: Mode
  onModeChange: (m: Mode) => void
  classes: ClassItem[]
  openClass: string | null
  activeClass: ClassItem | null
  activeSyllabus: Syllabus | null
  onToggleClass: (id: string) => void
  onSelectSubject: (cls: ClassItem) => void
  nudgeActive: boolean
  userEmail: string
  onAddClass: () => void
}

export function WorkspaceSidebar({
  mode, onModeChange,
  classes, openClass, activeClass, activeSyllabus,
  onToggleClass, onSelectSubject,
  nudgeActive, userEmail, onAddClass,
}: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-screen overflow-hidden">
      {/* Wordmark */}
      <div className="px-5 py-5 border-b border-zinc-100">
        <span className="text-base font-semibold text-zinc-900">AnyGrade</span>
      </div>

      {/* Mode tabs */}
      <nav className="px-3 py-3 border-b border-zinc-100 space-y-0.5">
        {MODES.map((m) => {
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-left transition-colors ${
                active
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          )
        })}
      </nav>

      {/* Classes header */}
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Classes</span>
        {nudgeActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        )}
        <button
          onClick={onAddClass}
          title="Add class"
          className="ml-auto text-zinc-400 hover:text-zinc-600 text-lg leading-none"
        >+</button>
      </div>

      {/* Class list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {classes.length === 0 && (
          <p className="px-3 py-2 text-xs text-zinc-400 italic">No classes yet</p>
        )}
        {classes.map((cls) => {
          const isOpen = openClass === cls.id
          const isActive = activeClass?.id === cls.id
          const sylIsActive = isActive && activeSyllabus != null

          return (
            <div key={cls.id}>
              <button
                onClick={() => onToggleClass(cls.id)}
                className={`flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-left transition-colors ${
                  isOpen ? "text-zinc-900 font-medium" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="text-[10px] text-zinc-400 w-2.5">{isOpen ? "▾" : "▸"}</span>
                {cls.name}
              </button>

              {isOpen && (
                <div className="ml-5 mb-1">
                  {cls.joinCode && (
                    <div className="flex items-center gap-1.5 px-3 py-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Join</span>
                      <span className="text-[10px] font-mono text-green-600 tracking-wide">{cls.joinCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${cls.joinCode}`)}
                        title="Copy join link"
                        className="text-zinc-400 hover:text-zinc-600 text-xs"
                      >⧉</button>
                    </div>
                  )}
                  {cls.syllabus ? (
                    <button
                      onClick={() => onSelectSubject(cls)}
                      className={`flex items-baseline gap-2 w-full rounded-md px-3 py-1.5 text-left transition-colors ${
                        sylIsActive ? "bg-green-50 text-green-700" : "hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-xs font-semibold text-green-600">{cls.syllabus.subject_code}</span>
                      <span className="text-xs text-zinc-500 truncate">{cls.syllabus.subject_title}</span>
                    </button>
                  ) : (
                    <p className="px-3 py-1 text-xs text-zinc-400 italic">No syllabus linked</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-zinc-100">
        <p className="px-3 text-xs text-zinc-400 truncate mb-2">{userEmail}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}

