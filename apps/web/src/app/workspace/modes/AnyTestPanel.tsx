"use client"

import { useCallback } from "react"
import type { ClassItem, Syllabus, QuizState, QuizTypeId } from "../types"
import { Q_TYPES, ASSESSMENT_TYPES } from "../types"

type Props = {
  activeClass: ClassItem | null
  activeSyllabus: Syllabus | null
  quizState: QuizState
  onQuizChange: (s: QuizState) => void
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 32, height: 18, flexShrink: 0, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <span style={{
        position: "absolute", inset: 0,
        background: checked ? "#4DB832" : "#2a2a2a",
        borderRadius: 18, transition: "background .15s",
      }}>
        <span style={{
          position: "absolute",
          width: 12, height: 12, top: 3,
          left: checked ? 17 : 3,
          background: "#fff", borderRadius: "50%", transition: "left .15s",
        }} />
      </span>
    </label>
  )
}

function Stepper({ value, onDecrement, onIncrement, min = 1 }: {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  min?: number
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", borderRadius: 6, padding: "4px 8px" }}>
      <button
        onClick={onDecrement} disabled={value <= min}
        style={{ background: "none", border: "none", color: value <= min ? "#333" : "#aaa", fontSize: 16, cursor: value <= min ? "default" : "pointer", padding: 0, lineHeight: 1, width: 18 }}
      >−</button>
      <span style={{ fontSize: 13, color: "#18181b", minWidth: 20, textAlign: "center" }}>{value}</span>
      <button
        onClick={onIncrement}
        style={{ background: "none", border: "none", color: "#71717a", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, width: 18 }}
      >+</button>
    </div>
  )
}

export function AnyTestPanel({ activeClass, activeSyllabus, quizState, onQuizChange }: Props) {
  const update = useCallback((patch: Partial<QuizState>) => {
    onQuizChange({ ...quizState, ...patch })
  }, [quizState, onQuizChange])

  const updateType = useCallback((id: QuizTypeId, patch: Partial<{ on: boolean; qty: number; pts: number }>) => {
    onQuizChange({
      ...quizState,
      types: { ...quizState.types, [id]: { ...quizState.types[id], ...patch } },
    })
  }, [quizState, onQuizChange])

  const activeTypes = Q_TYPES.filter((qt) => quizState.types[qt.id].on)
  const totalPts = activeTypes.reduce((acc, qt) => acc + quizState.types[qt.id].qty * quizState.types[qt.id].pts, 0)
  const totalMin = activeTypes.reduce((acc, qt) => acc + quizState.types[qt.id].qty * qt.timeMin, 0)

  const isRightReady = quizState.topic !== "" && activeTypes.length > 0
  const isFullyReady = activeClass !== null && isRightReady

  async function handleGenerate() {
    // Word export — implementation detail for engineering
    // Will call a server action or use the `docx` npm package client-side
    alert("Quiz generation coming soon — will download as .docx")
  }

  const fieldLblStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: ".1em", color: "#71717a", marginBottom: 6, display: "block",
  }
  const selectStyle: React.CSSProperties = {
    width: "100%", background: "#ffffff", border: "1px solid #e4e4e7",
    borderRadius: 8, color: "#18181b", fontSize: 13, padding: "9px 12px",
    appearance: "none", cursor: "pointer", outline: "none",
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left — context */}
      <div style={{ width: "40%", padding: "28px 24px 0 32px", borderRight: "1px solid #1c1c1c", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>

        {/* Subject chip */}
        {activeSyllabus ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "10px 14px", background: "#ffffff", borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#4DB832" }}>{activeSyllabus.subject_code}</span>
            <span style={{ fontSize: 12, color: "#71717a" }}>{activeSyllabus.subject_title}</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic", paddingTop: 4 }}>
            Select a class from the left →
          </div>
        )}

        {/* Topic */}
        <div>
          <label style={fieldLblStyle}>Topic</label>
          <select
            value={quizState.topic}
            onChange={(e) => update({ topic: e.target.value })}
            disabled={!activeSyllabus}
            style={{ ...selectStyle, opacity: activeSyllabus ? 1 : 0.4, cursor: activeSyllabus ? "pointer" : "default" }}
          >
            <option value="">Select a topic…</option>
            {(activeSyllabus?.topics ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Assessment type */}
        <div>
          <label style={fieldLblStyle}>Assessment Type</label>
          <select
            value={quizState.assessmentType}
            onChange={(e) => update({ assessmentType: e.target.value as QuizState["assessmentType"] })}
            style={selectStyle}
          >
            {ASSESSMENT_TYPES.map((at) => (
              <option key={at.value} value={at.value}>{at.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right — question type stack */}
      <div style={{ flex: 1, padding: "28px 32px 0 24px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {Q_TYPES.map((qt) => {
            const row = quizState.types[qt.id]
            return (
              <div
                key={qt.id}
                style={{
                  borderRadius: 8, background: "#ffffff",
                  padding: "12px 14px",
                  opacity: row.on ? 1 : 0.5,
                  transition: "opacity .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: row.on ? 12 : 0 }}>
                  <ToggleSwitch checked={row.on} onChange={() => updateType(qt.id, { on: !row.on })} />
                  <span style={{ fontSize: 13, color: row.on ? "#fff" : "#888" }}>{qt.label}</span>
                </div>

                {row.on && (
                  <div style={{ display: "flex", alignItems: "center", gap: 20, paddingLeft: 42 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>Questions</span>
                      <Stepper value={row.qty} onDecrement={() => updateType(qt.id, { qty: row.qty - 1 })} onIncrement={() => updateType(qt.id, { qty: row.qty + 1 })} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>Pts / question</span>
                      <Stepper value={row.pts} onDecrement={() => updateType(qt.id, { pts: row.pts - 1 })} onIncrement={() => updateType(qt.id, { pts: row.pts + 1 })} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: "auto", textAlign: "right" }}>
                      <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>Subtotal</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#18181b", paddingRight: 4 }}>{row.qty * row.pts} pts</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderTop: "1px solid #e4e4e7", flexShrink: 0 }}>
          {/* Randomize toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ToggleSwitch checked={quizState.randomize} onChange={() => update({ randomize: !quizState.randomize })} />
            <span style={{ fontSize: 12, color: "#71717a" }}>Randomize</span>
          </div>

          {/* Personalize toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ToggleSwitch checked={quizState.personalize} onChange={() => update({ personalize: !quizState.personalize })} />
            <span style={{ fontSize: 12, color: "#71717a" }}>Personalize</span>
          </div>

          {/* Totals */}
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            {isRightReady ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#18181b" }}>{totalPts} pts</div>
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>~{Math.round(totalMin)} min</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic" }}>Toggle question types above</div>
            )}
          </div>

          <button
            disabled={!isFullyReady}
            onClick={handleGenerate}
            style={{
              padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "none", cursor: isFullyReady ? "pointer" : "default",
              background: isFullyReady ? "#4DB832" : "#2a2a2a",
              color: isFullyReady ? "#fff" : "#555",
              transition: "background .15s",
            }}
          >
            Generate quiz →
          </button>
        </div>
      </div>
    </div>
  )
}



