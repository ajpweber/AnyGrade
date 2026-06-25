"use client"

import { useState, useCallback, useRef } from "react"
import type { ClassItem, Mode, Syllabus, QuizState } from "./types"
import { INITIAL_QUIZ_STATE } from "./types"
import { createClient } from "@/lib/supabase/client"
import { WorkspaceSidebar } from "./WorkspaceSidebar"
import { AnyTestPanel } from "./modes/AnyTestPanel"
import { AnyGradePanel } from "./modes/AnyGradePanel"
import { AnySubjectPanel } from "./modes/AnySubjectPanel"

type Props = {
  classes: ClassItem[]
  userEmail: string
}

const inputCls = "w-full border border-zinc-200 rounded-lg bg-white text-zinc-900 text-sm px-3 py-2 outline-none focus:border-zinc-400 placeholder:text-zinc-400"
const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5"

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
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-zinc-200 rounded-xl p-8 w-[440px] max-w-[calc(100vw-48px)] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <span className="text-base font-semibold text-zinc-900">New class</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Class name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BSEE 2-A" className={inputCls} />
          </div>

          <div className="flex gap-3">
            <div className="w-[120px] shrink-0">
              <label className={labelCls}>Subject code *</label>
              <input required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. ENG001" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Subject title *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Engineering Dynamics" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Academic year</label>
              <input value={ay} onChange={e => setAy(e.target.value)} placeholder="e.g. 2025–2026" className={inputCls} />
            </div>
            <div className="w-[120px] shrink-0">
              <label className={labelCls}>Semester</label>
              <select value={sem} onChange={e => setSem(e.target.value)} className={inputCls}>
                <option value="">—</option>
                <option value="1">1st</option>
                <option value="2">2nd</option>
                <option value="3">Summer</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create class"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50"
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
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13 }}>
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

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {mode === "quiz" && (
          <AnyTestPanel
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

