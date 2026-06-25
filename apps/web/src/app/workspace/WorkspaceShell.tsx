"use client"

import { useState, useCallback, useRef } from "react"
import type { ClassItem, Mode, Syllabus, QuizState } from "./types"
import { INITIAL_QUIZ_STATE } from "./types"
import { createClient } from "@/lib/supabase/client"
import { WorkspaceSidebar } from "./WorkspaceSidebar"
import { AnyQuizPanel } from "./modes/AnyQuizPanel"
import { AnyGradePanel } from "./modes/AnyGradePanel"
import { AnySubjectPanel } from "./modes/AnySubjectPanel"

type Props = {
  classes: ClassItem[]
  userEmail: string
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 8, color: "#fff", fontSize: 13, padding: "9px 12px",
  outline: "none", boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: ".1em", color: "#666", marginBottom: 6,
}

function AddClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [title, setTitle] = useState("")
  const [ay, setAy] = useState("")
  const [sem, setSem] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const supabase = useRef(createClient()).current

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not signed in."); setSaving(false); return }

    // 1. Create syllabus row
    const { data: syl, error: sylErr } = await supabase
      .from("school_syllabi")
      .insert({
        subject_code: code.trim().toUpperCase(),
        subject_title: title.trim(),
        institution: "",
        ...(ay ? { academic_year: ay.trim() } : {}),
        ...(sem ? { semester: parseInt(sem) } : {}),
      })
      .select("id")
      .single()

    if (sylErr) {
      console.error("[AddClass] syllabus insert error:", sylErr)
      setError(sylErr.message)
      setSaving(false)
      return
    }

    // 2. Create class row
    const { error: clsErr } = await supabase
      .from("classes")
      .insert({
        teacher_id: user.id,
        name: name.trim(),
        syllabus_id: syl.id,
        ...(ay ? { academic_year: ay.trim() } : {}),
        ...(sem ? { semester: sem } : {}),
      })

    if (clsErr) {
      console.error("[AddClass] class insert error:", clsErr)
      setError(clsErr.message)
      setSaving(false)
      return
    }

    onCreated()
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12, padding: "28px 32px", width: 440, maxWidth: "calc(100vw - 48px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>New class</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Class name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BSEE 2-A" style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: "0 0 120px" }}>
              <label style={labelStyle}>Subject code *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ENG001" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Subject title *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Engineering Dynamics" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Academic year</label>
              <input value={ay} onChange={e => setAy(e.target.value)} placeholder="e.g. 2025–2026" style={inputStyle} />
            </div>
            <div style={{ flex: "0 0 120px" }}>
              <label style={labelStyle}>Semester</label>
              <select value={sem} onChange={e => setSem(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="">—</option>
                <option value="1">1st</option>
                <option value="2">2nd</option>
                <option value="3">Summer</option>
              </select>
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#4DB832", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Creating…" : "Create class"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #2a2a2a", background: "none", color: "#888", fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WorkspaceShell({ classes, userEmail }: Props) {
  const [mode, setMode] = useState<Mode>("quiz")
  const [openClass, setOpenClass] = useState<string | null>(null)
  const [activeClass, setActiveClass] = useState<ClassItem | null>(null)
  const [activeSyllabus, setActiveSyllabus] = useState<Syllabus | null>(null)
  const [quizState, setQuizState] = useState<QuizState>(INITIAL_QUIZ_STATE)
  const [showAddClass, setShowAddClass] = useState(false)

  const toggleClass = useCallback((id: string) => {
    setOpenClass((prev) => {
      const next = prev === id ? null : id
      if (next !== null) {
        const cls = classes.find((c) => c.id === id)
        if (cls?.syllabus) {
          setActiveClass(cls)
          setActiveSyllabus(cls.syllabus)
        }
      }
      return next
    })
  }, [classes])

  const selectSubject = useCallback((cls: ClassItem) => {
    setActiveClass(cls)
    setActiveSyllabus(cls.syllabus)
    setQuizState((prev) => ({ ...prev, topic: "" }))
  }, [])

  const activeTypes = Object.values(quizState.types).filter((t) => t.on)
  const isRightReady = quizState.topic !== "" && activeTypes.length > 0
  const nudgeActive = mode === "quiz" && isRightReady && activeClass === null

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13, overflow: "hidden" }}>
      <WorkspaceSidebar
        mode={mode}
        onModeChange={setMode}
        classes={classes}
        openClass={openClass}
        activeClass={activeClass}
        activeSyllabus={activeSyllabus}
        onToggleClass={toggleClass}
        onSelectSubject={selectSubject}
        nudgeActive={nudgeActive}
        userEmail={userEmail}
        onAddClass={() => setShowAddClass(true)}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {mode === "quiz" && (
          <AnyQuizPanel
            activeClass={activeClass}
            activeSyllabus={activeSyllabus}
            quizState={quizState}
            onQuizChange={setQuizState}
          />
        )}
        {mode === "grade" && (
          <AnyGradePanel activeClassId={activeClass?.id ?? null} />
        )}
        {mode === "subject" && (
          <AnySubjectPanel activeClass={activeClass} />
        )}
      </main>

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onCreated={() => {
            setShowAddClass(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
