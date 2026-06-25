"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ClassItem, Assessment, Submission, TierId } from "../types"
import { TIERS, DEFAULT_MESSAGES, classifyScore } from "../types"

type Props = {
  activeClass: ClassItem | null
}

type Approvals = Record<TierId, boolean>
type Messages = Record<TierId, string>

function classifyTier(s: Submission, maxScore: number): TierId {
  return classifyScore(s.raw_score, maxScore)
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5z" />
      <path d="M14.2 5.3l1-1a.7.7 0 0 1 1 0l1 1a.7.7 0 0 1 0 1l-1 1-2-2z" />
    </svg>
  )
}

function ResultsCard({ submissions, maxScore }: { submissions: Submission[]; maxScore: number }) {
  const [expanded, setExpanded] = useState(true)
  const scores = submissions.map((s) => s.raw_score)
  if (scores.length === 0) return null

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const passing = scores.filter((s) => s / maxScore >= 0.5).length
  const passRate = Math.round((passing / scores.length) * 100)

  return (
    <div style={{ background: "#ffffff", borderRadius: 10, marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", background: "none", border: "none", color: "#18181b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
      >
        Class results
        <span style={{ fontSize: 10, color: "#a1a1aa" }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{ display: "flex", gap: 0, padding: "0 16px 14px", borderTop: "1px solid #222" }}>
          {[
            { val: mean.toFixed(1), lbl: "Mean" },
            { val: `${passRate}%`,  lbl: "Passing" },
            { val: Math.max(...scores), lbl: "Highest" },
            { val: Math.min(...scores), lbl: "Lowest" },
          ].map((s) => (
            <div key={s.lbl} style={{ flex: 1, paddingTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#18181b" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TierBlock({
  tier, students, message, onMessageChange, approved, onApprove,
}: {
  tier: typeof TIERS[number]
  students: Submission[]
  message: string
  onMessageChange: (m: string) => void
  approved: boolean
  onApprove: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div style={{ border: `1px solid ${tier.color}`, borderRadius: 10, background: tier.bg, padding: "16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ color: tier.color, fontWeight: 600, fontSize: 13 }}>{tier.label}</span>
        <span style={{ fontSize: 11, color: "#71717a" }}>{tier.range}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#71717a" }}>{students.length} student{students.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Message */}
      <div style={{ marginBottom: 10 }}>
        {editing ? (
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={3}
            style={{ width: "100%", background: "#f9fafb", border: "1px solid #e4e4e7", borderRadius: 6, color: "#3f3f46", fontSize: 12, padding: "8px 10px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <p style={{ flex: 1, fontSize: 12, color: "#71717a", margin: 0, lineHeight: 1.5 }}>{message}</p>
            <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: 2, flexShrink: 0 }}><PencilIcon /></button>
          </div>
        )}
      </div>

      {/* Students */}
      {students.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
          {students.map((s) => (
            <div key={s.id} style={{ fontSize: 12, color: "#71717a", padding: "3px 0" }}>
              {s.students?.full_name ?? "—"}
            </div>
          ))}
        </div>
      )}

      {/* Approve */}
      <button
        onClick={onApprove}
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "none",
          border: `1px solid ${approved ? tier.color : "#333"}`,
          borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11,
          color: approved ? tier.color : "#555",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${approved ? tier.color : "#444"}`, background: approved ? tier.color : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {approved && <span style={{ color: "#18181b", fontSize: 9, fontWeight: 700 }}>✓</span>}
        </span>
        {approved ? "Approved" : "Approve this message"}
      </button>
    </div>
  )
}

export function AnySubjectPanel({ activeClass }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [messages, setMessages] = useState<Messages>({ ...DEFAULT_MESSAGES })
  const [approvals, setApprovals] = useState<Approvals>({ upper: false, middle: false, atrisk: false })

  const supabase = useRef(createClient()).current

  useEffect(() => {
    if (!activeClass) { setAssessments([]); setSelectedId(null); return }
    setLoadingAssessments(true)
    supabase
      .from("assessments")
      .select("id, title, conducted_at, max_score, total_items, type")
      .eq("class_id", activeClass.id)
      .order("conducted_at", { ascending: false })
      .then(({ data }) => { setAssessments(data ?? []); setLoadingAssessments(false) })
  }, [activeClass?.id])

  useEffect(() => {
    if (!selectedId) { setSubmissions([]); return }
    setLoadingSubmissions(true)
    supabase
      .from("submissions")
      .select("id, raw_score, students ( id, full_name, email )")
      .eq("assessment_id", selectedId)
      .not("raw_score", "is", null)
      .then(({ data }) => {
        setSubmissions((data as Submission[]) ?? [])
        setLoadingSubmissions(false)
      })
  }, [selectedId])

  const activeAssessment = assessments.find((a) => a.id === selectedId)
  const maxScore = activeAssessment?.max_score ?? 100

  const tierStudents = useCallback((id: TierId) =>
    submissions.filter((s) => classifyTier(s, maxScore) === id),
    [submissions, maxScore])

  const allApproved = Object.values(approvals).every(Boolean)

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
    <div style={{ display: "flex", height: "100%", overflow: "hidden", position: "relative" }}>

      {/* Left — selectors */}
      <div style={{ width: "35%", padding: "28px 20px 0 32px", borderRight: "1px solid #1c1c1c", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

        {/* Subject chip */}
        {activeClass?.syllabus ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "10px 14px", background: "#ffffff", borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#4DB832" }}>{activeClass.syllabus.subject_code}</span>
            <span style={{ fontSize: 12, color: "#71717a" }}>{activeClass.syllabus.subject_title}</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic" }}>
            {activeClass ? "No syllabus linked" : "Select a class from the left →"}
          </div>
        )}

        {/* Assessment picker */}
        <div>
          <label style={fieldLblStyle}>Assessment</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => { setSelectedId(e.target.value || null); setApprovals({ upper: false, middle: false, atrisk: false }) }}
            disabled={!activeClass || loadingAssessments}
            style={{ ...selectStyle, opacity: activeClass ? 1 : 0.4, cursor: activeClass ? "pointer" : "default" }}
          >
            <option value="">Select an assessment…</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
                {a.conducted_at ? ` — ${new Date(a.conducted_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right — insights */}
      <div style={{ flex: 1, padding: "28px 32px 0 24px", overflowY: "auto" }}>
        {!selectedId && (
          <div style={{ fontSize: 12, color: "#a1a1aa", fontStyle: "italic", paddingTop: 4 }}>
            Select an assessment to view insights.
          </div>
        )}

        {selectedId && loadingSubmissions && (
          <div style={{ fontSize: 12, color: "#a1a1aa" }}>Loading…</div>
        )}

        {selectedId && !loadingSubmissions && (
          <>
            <ResultsCard submissions={submissions} maxScore={maxScore} />

            {/* Tier previews */}
            {TIERS.map((tier) => {
              const count = tierStudents(tier.id).length
              return (
                <div key={tier.id} style={{ border: `1px solid ${tier.color}`, borderRadius: 10, background: tier.bg, padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
                    <span style={{ fontSize: 11, color: "#71717a" }}>{tier.range}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#71717a" }}>{count} student{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#71717a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {DEFAULT_MESSAGES[tier.id]}
                  </div>
                </div>
              )
            })}

            <button
              onClick={() => setOverlayOpen(true)}
              style={{ marginTop: 16, width: "100%", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#4DB832", color: "#18181b", cursor: "pointer" }}
            >
              Review &amp; send →
            </button>
          </>
        )}
      </div>

      {/* Feedback overlay */}
      {overlayOpen && (
        <div style={{ position: "absolute", inset: 0, background: "#f9fafb", zIndex: 10, display: "flex", flexDirection: "column", padding: "28px 32px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#18181b" }}>Send feedback</span>
            <button onClick={() => setOverlayOpen(false)} style={{ background: "none", border: "none", color: "#a1a1aa", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>

          {TIERS.map((tier) => (
            <TierBlock
              key={tier.id}
              tier={tier}
              students={tierStudents(tier.id)}
              message={messages[tier.id]}
              onMessageChange={(m) => setMessages((prev) => ({ ...prev, [tier.id]: m }))}
              approved={approvals[tier.id]}
              onApprove={() => setApprovals((prev) => ({ ...prev, [tier.id]: !prev[tier.id] }))}
            />
          ))}

          <button
            disabled={!allApproved}
            style={{
              marginTop: 8, padding: "12px 24px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, border: "none",
              background: allApproved ? "#4DB832" : "#2a2a2a",
              color: allApproved ? "#fff" : "#555",
              cursor: allApproved ? "pointer" : "default",
            }}
          >
            Send to {submissions.length} student{submissions.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  )
}


