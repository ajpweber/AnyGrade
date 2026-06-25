"use client"

import { signOut } from "@/app/login/actions"
import type { ClassItem, Mode, Syllabus } from "./types"

function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5z" />
      <path d="M14.2 5.3l1-1a.7.7 0 0 1 1 0l1 1a.7.7 0 0 1 0 1l-1 1-2-2z" />
    </svg>
  )
}

function GradeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="14" height="16" rx="2" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  )
}

function SubjectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17h2v-6H3v6zm4 0h2V8H7v9zm4 0h2V5h-2v12z" />
    </svg>
  )
}

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "quiz",    label: "AnyQuiz",    icon: <QuizIcon /> },
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
    <aside style={{
      width: 220, flexShrink: 0,
      borderRight: "1px solid #222",
      display: "flex", flexDirection: "column",
      background: "#111", height: "100vh", overflow: "hidden",
    }}>
      {/* Wordmark */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #222", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", flexShrink: 0 }}>
        AnyGrade
      </div>

      {/* Mode tabs */}
      <div style={{ flexShrink: 0 }}>
        {MODES.map((m) => {
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 18px",
                background: active ? "#161616" : "none",
                border: "none",
                borderLeft: active ? "2px solid #4DB832" : "2px solid transparent",
                color: active ? "#fff" : "#888",
                fontSize: 13, cursor: "pointer", textAlign: "left",
              }}
            >
              {m.icon}
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Classes header */}
      <div style={{ flexShrink: 0, padding: "14px 18px 8px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
          Classes
        </span>
        {nudgeActive && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#4DB832",
            animation: "ag-pulse 1.4s ease-in-out infinite", flexShrink: 0,
          }} />
        )}
        <button
          onClick={onAddClass}
          title="Add class"
          style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#555", fontSize: 18, lineHeight: 1, cursor: "pointer",
            padding: "0 2px", display: "flex", alignItems: "center",
          }}
        >+</button>
      </div>

      {/* Class list — scrollable */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {classes.length === 0 && (
          <div style={{ padding: "8px 18px", fontSize: 12, color: "#444", fontStyle: "italic" }}>
            No classes yet
          </div>
        )}
        {classes.map((cls) => {
          const isOpen = openClass === cls.id
          const isActive = activeClass?.id === cls.id
          const sylIsActive = isActive && activeSyllabus != null

          return (
            <div key={cls.id}>
              <button
                onClick={() => onToggleClass(cls.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "9px 18px",
                  background: "none", border: "none",
                  color: isOpen ? "#fff" : "#ccc",
                  fontSize: 13, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 10, color: "#555", width: 10 }}>
                  {isOpen ? "▾" : "▸"}
                </span>
                {cls.name}
              </button>

              {isOpen && (
                <div style={{ paddingBottom: 4 }}>
                  {cls.syllabus ? (
                    <button
                      onClick={() => onSelectSubject(cls)}
                      style={{
                        display: "flex", alignItems: "baseline", gap: 8,
                        width: "100%", padding: "6px 18px 6px 30px",
                        background: sylIsActive ? "rgba(77,184,50,.12)" : "none",
                        border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ color: "#4DB832", fontWeight: 600, fontSize: 11 }}>
                        {cls.syllabus.subject_code}
                      </span>
                      <span style={{ color: "#aaa", fontSize: 12 }}>
                        {cls.syllabus.subject_title}
                      </span>
                    </button>
                  ) : (
                    <div style={{ padding: "6px 18px 6px 30px", fontSize: 12, color: "#555", fontStyle: "italic" }}>
                      No syllabus linked
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — sign out */}
      <div style={{ flexShrink: 0, padding: "12px 18px", borderTop: "1px solid #1c1c1c" }}>
        <div style={{ fontSize: 11, color: "#444", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <form action={signOut}>
          <button type="submit" style={{ background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer", padding: 0 }}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
