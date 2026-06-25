"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CropAnnotation } from "./CropAnnotation"
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

const ITEM_COLOR = (correct: boolean | null) =>
  correct === true ? "#4DB832" : correct === false ? "#D97706" : "#ef4444"

export function CorrectionClient({
  token, studentName, assessmentTitle, gradeResult, scanUrl, status: initialStatus,
}: Props) {
  // Flagged items first, then correct items with bboxes — 5–10 total for training
  const hasBbox = (r: typeof gradeResult.results[0]) =>
    (r.bboxes && r.bboxes.length > 0) || !!r.bbox
  const flagged = gradeResult.results.filter(
    (r) => (r.correct === false || r.correct === null) && hasBbox(r),
  )
  const correct = gradeResult.results.filter((r) => r.correct === true && hasBbox(r))
  const items   = [...flagged, ...correct].slice(0, 10)

  const [step, setStep]           = useState(0)
  const [corrections, setCorr]    = useState<Record<string, BBox[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(initialStatus === "completed")

  if (done) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h2 style={{ margin: "0 0 8px", color: "#4DB832" }}>Thank you, {studentName ?? "Student"}!</h2>
          <p style={{ color: "#666", margin: 0 }}>Your corrections have been submitted. Your teacher will receive the updated accuracy data.</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ margin: "0 0 8px" }}>{assessmentTitle}</h2>
          <p style={{ color: "#4DB832", fontWeight: 600 }}>
            All your answers were read correctly — nothing to confirm.
          </p>
          <p style={{ color: "#666", fontSize: 13 }}>
            Score: {gradeResult.rawScore}/{gradeResult.maxScore}
          </p>
        </div>
      </div>
    )
  }

  const current = items[step]
  const isLast  = step === items.length - 1

  function handleConfirm(corrected: BBox[]) {
    setCorr((prev) => ({ ...prev, [current.label]: corrected }))
    if (!isLast) {
      setStep((s) => s + 1)
    }
  }

  async function handleSubmit() {
    const allCorr = { ...corrections }
    if (!allCorr[current.label]) {
      const boxes = current.bboxes ?? (current.bbox ? [current.bbox] : undefined)
      if (boxes) allCorr[current.label] = boxes
    }

    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as any
    await sb.from("correction_tasks").update({
      corrected_bboxes: allCorr,
      status:           "completed",
      completed_at:     new Date().toISOString(),
    }).eq("token", token)
    setDone(true)
    setSubmitting(false)
  }

  const confirmedCount = Object.keys(corrections).length

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 500, width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{assessmentTitle}</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>
            Hi {studentName ?? "Student"} — help us improve accuracy
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Drag the colored box to where your answer actually is on your paper.
            {" "}{items.length} item{items.length !== 1 ? "s" : ""} to confirm.
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {flagged.map((r, i) => (
            <div
              key={r.label}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < step ? "#4DB832" : i === step ? "#4DB832aa" : "#2a2a2a",
              }}
            />
          ))}
        </div>

        {/* Item label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#aaa" }}>
            Item {step + 1} of {items.length}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: ITEM_COLOR(current.correct), background: `${ITEM_COLOR(current.correct)}18`, padding: "2px 8px", borderRadius: 4 }}>
            {current.label} — {current.correct === null ? "Unread" : "Wrong"}
          </span>
          <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.read}
          </span>
        </div>

        {/* Crop drag area */}
        {(() => {
          const boxes = current.bboxes ?? (current.bbox ? [current.bbox] : undefined)
          return boxes && boxes.length > 0 ? (
            <CropAnnotation
              key={current.label}
              scanUrl={scanUrl}
              page={boxes[0].page}
              bboxes={boxes}
              label={current.label}
              color={ITEM_COLOR(current.correct)}
              onConfirm={handleConfirm}
            />
          ) : null
        })()}

        {/* Submit — shown after last item is confirmed */}
        {(isLast && corrections[current.label]) || confirmedCount === items.length ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ marginTop: 20, width: "100%", padding: "12px", borderRadius: 8, background: submitting ? "#2a2a2a" : "#4DB832", color: submitting ? "#555" : "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: submitting ? "default" : "pointer" }}
          >
            {submitting ? "Submitting…" : "Submit all corrections"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0d0d0d",
  color: "#fff",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "48px 16px",
  fontFamily: "system-ui, sans-serif",
}

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  borderRadius: 14,
  padding: "32px 28px",
  textAlign: "center",
  maxWidth: 400,
  width: "100%",
}
