"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CropAnnotation, type CropAnnotationHandle } from "./CropAnnotation"
import type { GradeFileResult, BBox } from "@/app/api/grade/types"

type Props = {
  token: string
  studentName: string | null
  assessmentTitle: string
  assessmentType: string
  scanUrl: string
  gradeResult: GradeFileResult
  status: string
}

const NOTATION_GUIDE = [
  { group: "Scripts",       chips: [{ label: "^ superscript", insert: "^" }, { label: "_ subscript", insert: "_" }] },
  { group: "Greek letters", chips: [
    { label: "theta", insert: "theta" }, { label: "phi", insert: "phi" },
    { label: "omega", insert: "omega" }, { label: "alpha", insert: "alpha" },
    { label: "beta", insert: "beta" },   { label: "pi", insert: "pi" },
  ]},
  { group: "Operations",    chips: [
    { label: "sqrt()", insert: "sqrt()" }, { label: "/ fraction", insert: "/" },
    { label: "* multiply",  insert: "*" }, { label: "deg °",      insert: "deg" },
    { label: ".dot θ̇",    insert: ".dot" }, { label: "inf ∞",    insert: "inf" },
  ]},
]

function cleanName(raw: string | null): string {
  if (!raw) return "Student"
  const stripped = raw.replace(/\.[a-zA-Z0-9]+$/, "")
  if (!stripped.includes(" ") && stripped.includes("_")) return "Student"
  return stripped
}

export function CorrectionClient({
  token, studentName, assessmentTitle, gradeResult, scanUrl, status: initialStatus,
}: Props) {
  const name = cleanName(studentName)
  const hasBbox = (r: typeof gradeResult.results[0]) =>
    (r.bboxes && r.bboxes.length > 0) || !!r.bbox
  const flagged = gradeResult.results.filter(
    (r) => (r.correct === false || r.correct === null) && hasBbox(r),
  )
  const correct  = gradeResult.results.filter((r) => r.correct === true && hasBbox(r))
  const items    = [...flagged, ...correct].slice(0, 5)

  const [step, setStep]               = useState(0)
  const [bboxCorr, setBboxCorr]       = useState<Record<string, BBox[]>>({})
  const [readingCorr, setReadingCorr] = useState<Record<string, string>>({})
  const [currentReading, setCurrentReading] = useState(items[0]?.read ?? "")
  const [guideOpen, setGuideOpen]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(initialStatus === "completed")

  const cropRef      = useRef<CropAnnotationHandle>(null)
  const readingInput = useRef<HTMLTextAreaElement>(null)

  const current = items[step]
  const isLast  = step === items.length - 1

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentReading(items[step]?.read ?? "")
    setGuideOpen(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (done) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12, color: "#4DB832" }}>✓</div>
          <h2 style={{ margin: "0 0 8px", color: "#4DB832" }}>Thank you, {name}!</h2>
          <p style={{ color: "#666", margin: "0 0 12px" }}>Your corrections are pending teacher review.</p>
          <p style={{ color: "#555", fontSize: 13, background: "#161616", border: "0.5px solid #2a2a2a", borderRadius: 8, padding: "12px 14px", lineHeight: 1.6 }}>
            Your grade may be updated once your teacher approves.
          </p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 8px" }}>{assessmentTitle}</h2>
          <p style={{ color: "#4DB832", fontWeight: 600 }}>All answers were read correctly — nothing to confirm.</p>
          <p style={{ color: "#666", fontSize: 13 }}>Score: {gradeResult.rawScore}/{gradeResult.maxScore}</p>
        </div>
      </div>
    )
  }

  function handleConfirmAndNext() {
    const boxes   = cropRef.current?.getBoxes() ?? []
    const reading = readingInput.current?.value ?? currentReading

    setBboxCorr((prev)    => ({ ...prev, [current.label]: boxes }))
    setReadingCorr((prev) => ({ ...prev, [current.label]: reading }))

    if (!isLast) {
      setStep((s) => s + 1)
    }
  }

  async function handleSubmit() {
    const boxes   = cropRef.current?.getBoxes() ?? []
    const reading = readingInput.current?.value ?? currentReading

    const allBbox    = { ...bboxCorr,    [current.label]: boxes }
    const allReading = { ...readingCorr, [current.label]: reading }

    // Fill in any items the student didn't explicitly change
    items.forEach((r) => {
      if (!allBbox[r.label]) {
        const b = r.bboxes ?? (r.bbox ? [r.bbox] : undefined)
        if (b) allBbox[r.label] = b
      }
      if (!allReading[r.label]) allReading[r.label] = r.read ?? ""
    })

    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as any
    await sb.from("correction_tasks").update({
      corrected_bboxes:    allBbox,
      reading_corrections: allReading,
      status:              "completed",
      completed_at:        new Date().toISOString(),
    }).eq("token", token)
    setDone(true)
    setSubmitting(false)
  }

  const boxes = current.bboxes ?? (current.bbox ? [current.bbox] : undefined)

  function insertAtCursor(text: string) {
    const el = readingInput.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const val   = el.value
    el.value = val.slice(0, start) + text + val.slice(start)
    setCurrentReading(el.value)
    el.focus()
    el.selectionStart = el.selectionEnd = start + text.length
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 500, width: "100%", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{assessmentTitle}</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Hi {name} — help us improve accuracy</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Confirm the box location and what you actually wrote. {items.length} items.
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {items.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < step ? "#4DB832" : i === step ? "#4DB83288" : "#2a2a2a",
            }} />
          ))}
        </div>

        {/* Item label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>Item {step + 1} of {items.length}</span>
          <span style={{ color: "#444" }}>·</span>
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{current.label}</span>
        </div>

        {/* Bbox crop */}
        {boxes && boxes.length > 0 && (
          <CropAnnotation
            ref={cropRef}
            key={current.label}
            scanUrl={scanUrl}
            page={boxes[0].page}
            bboxes={boxes}
            label={current.label}
            color="#d97706"
          />
        )}

        {/* Reading correction card */}
        <div style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a", borderRadius: 12, padding: 16, margin: "16px 0" }}>
          <p style={rcLabel}>Claude read this as — correct if wrong</p>
          <textarea
            ref={readingInput}
            value={currentReading}
            onChange={(e) => setCurrentReading(e.target.value)}
            rows={2}
            style={{
              width: "100%", background: "#111", border: "1px solid #333", borderRadius: 6,
              padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#fff",
              outline: "none", lineHeight: 1.6, resize: "none",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#4DB832" }}
            onBlur={(e)  => { e.target.style.borderColor = "#333" }}
          />

          {/* Notation guide toggle */}
          <button
            onClick={() => setGuideOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 0 0", color: "#555", fontSize: 11 }}
          >
            <span>Notation guide</span>
            <span style={{ fontSize: 12, transform: guideOpen ? "rotate(180deg)" : "none", transition: "transform .2s", display: "inline-block" }}>▾</span>
          </button>

          {guideOpen && (
            <div style={{ marginTop: 8 }}>
              {NOTATION_GUIDE.map((group) => (
                <div key={group.group} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, color: "#444", letterSpacing: ".06em", marginBottom: 5 }}>{group.group}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {group.chips.map((chip) => (
                      <button
                        key={chip.insert}
                        onClick={() => insertAtCursor(chip.insert)}
                        style={{ fontSize: 11, fontFamily: "monospace", color: "#666", background: "#151515", border: "0.5px solid #2a2a2a", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm / Submit */}
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: "100%", padding: 13, borderRadius: 8, background: submitting ? "#2a2a2a" : "#4DB832", color: submitting ? "#555" : "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: submitting ? "default" : "pointer" }}
          >
            {submitting ? "Submitting…" : "Submit all corrections"}
          </button>
        ) : (
          <button
            onClick={handleConfirmAndNext}
            style={{ width: "100%", padding: 13, borderRadius: 8, background: "#4DB832", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Confirm &amp; next →
          </button>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0d0d0d", color: "#fff",
  display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "48px 16px", fontFamily: "system-ui, sans-serif",
}

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a", borderRadius: 14, padding: "32px 28px",
  textAlign: "center", maxWidth: 400, width: "100%",
}

const rcLabel: React.CSSProperties = {
  fontSize: 10, color: "#555", letterSpacing: ".08em", marginBottom: 8,
}
