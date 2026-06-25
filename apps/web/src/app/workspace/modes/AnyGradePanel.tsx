"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import type { AKSource, UploadFile, ScannerState } from "../types"
import { formatBytes, INITIAL_SCANNER_STATE } from "../types"
import type { GradeFileResult } from "@/app/api/grade/route"
import { createClient } from "@/lib/supabase/client"
import type { IdentityResult } from "@/app/api/extract-identity/route"
import type { SplitStudent } from "@/app/api/split-batch/route"
import { PdfAnnotated } from "./PdfAnnotated"

type Props = {
  activeClassId: string | null
}

// ── SVG icons ──────────────────────────────────────────────────────────────
function IconFiles() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" strokeLinejoin="round"/>
      <path d="M13 3v6h6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 13h6M9 17h4" strokeLinecap="round"/>
    </svg>
  )
}
function IconScanner() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="10" rx="1.5"/>
      <path d="M7 7V5a1 1 0 011-1h8a1 1 0 011 1v2" />
      <path d="M7 17v2M17 17v2" strokeLinecap="round"/>
      <path d="M5 12h14" strokeLinecap="round"/>
    </svg>
  )
}
function IconPhone() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="7" y="2" width="10" height="20" rx="2"/>
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
      <path d="M10 5h4" strokeLinecap="round"/>
    </svg>
  )
}
function IconQuizLink() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 8h10M7 12h10M7 16h6" strokeLinecap="round"/>
      <path d="M17 14.5l1.5 1.5 2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 15V4M12 4L8 8M12 4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" strokeLinecap="round"/>
    </svg>
  )
}
function IconCamera() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="20" height="15" rx="2"/>
      <circle cx="12" cy="13" r="4"/>
      <path d="M9 6l1.5-2h3L15 6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Shared components ──────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#71717a", marginBottom: 14 }}>
      {children}
    </div>
  )
}

interface SrcCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
  badge?: React.ReactNode
}

function SrcCard({ selected, onClick, icon, title, desc, badge }: SrcCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 160, display: "flex", flexDirection: "column", alignItems: "flex-start",
        gap: 0, padding: "16px 16px 14px", background: selected ? "rgba(77,184,50,.08)" : "#1a1a1a",
        borderRadius: 10, border: selected ? "1.5px solid #4DB832" : "1.5px solid #2a2a2a",
        cursor: "pointer", textAlign: "left", transition: "border-color .15s, background .15s",
        position: "relative",
      }}
    >
      {selected && (
        <span style={{ position: "absolute", top: 12, right: 14, fontSize: 11, fontWeight: 700, color: "#4DB832" }}>✓</span>
      )}
      <span style={{ color: selected ? "#4DB832" : "#555", marginBottom: 10 }}>{icon}</span>
      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? "#fff" : "#ccc", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.55 }}>{desc}</div>
      {badge && <div style={{ marginTop: 10 }}>{badge}</div>}
    </button>
  )
}

// ── Answer key text parser ──────────────────────────────────────────────────
function parseAnswerKeyText(text: string): { label: string; expected: string; pts?: number }[] {
  const results: { label: string; expected: string; pts?: number }[] = []
  for (const raw of text.split("\n")) {
    const l = raw.trim()
    if (!l || l.startsWith("#")) continue
    const parts = l.split("|").map((p) => p.trim())
    if (parts.length < 2) continue
    const [label, expected, ptsStr] = parts
    if (!label || !expected) continue
    const pts = ptsStr ? Number(ptsStr) : undefined
    results.push({ label, expected, pts: pts && pts > 0 ? pts : undefined })
  }
  return results
}

// ── Results list ──────────────────────────────────────────────────────────
type StudentStatus = "graded" | "needs-review" | "error" | "unidentified"

function fileStatus(file: GradeFileResult, identity: IdentityResult | undefined): StudentStatus {
  if (file.error) return "error"
  if (!identity?.name) return "unidentified"
  if (file.results.some((r) => r.correct === false || r.correct === null)) return "needs-review"
  return "graded"
}

const STATUS_BADGE: Record<StudentStatus, { label: string; bg: string; color: string }> = {
  "graded":        { label: "Graded",        bg: "rgba(77,184,50,.12)",  color: "#4DB832" },
  "needs-review":  { label: "Needs review",  bg: "rgba(217,119,6,.12)",  color: "#D97706" },
  "error":         { label: "Error",         bg: "rgba(239,68,68,.12)",  color: "#ef4444" },
  "unidentified":  { label: "Unidentified",  bg: "rgba(239,68,68,.12)",  color: "#ef4444" },
}

const BBOX_COLOR: Record<string, string> = {
  correct: "#4DB832",
  wrong:   "#D97706",
  unread:  "#ef4444",
}

function bboxColor(correct: boolean | null) {
  if (correct === true)  return BBOX_COLOR.correct
  if (correct === false) return BBOX_COLOR.wrong
  return BBOX_COLOR.unread
}

function StudentRow({ file, objectUrl, identity }: { file: GradeFileResult; objectUrl?: string; identity?: IdentityResult }) {
  const [expanded, setExpanded] = useState(false)
  const status = fileStatus(file, identity)
  const badge = STATUS_BADGE[status]
  const flagged = file.results.filter((r) => r.correct === false || r.correct === null)
  const displayName = identity?.name ?? file.filename.replace(/\.[^.]+$/, "")
  const isPdf = file.filename.toLowerCase().endsWith(".pdf")
  const hasBboxes = file.results.some((r) => r.bbox)

  // For unidentified: show 0 score since it can't be saved
  const displayScore = status === "unidentified" ? 0 : file.rawScore

  return (
    <div style={{ borderBottom: "1px solid #1c1c1c" }}>
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", background: expanded ? "#1a1a1a" : "transparent" }}
      >
        <span style={{ fontSize: 10, color: "#a1a1aa", flexShrink: 0 }}>{expanded ? "▴" : "▾"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
        </div>
        {file.maxScore > 0 && (
          <span style={{ fontSize: 11, color: status === "unidentified" ? "#ef4444" : "#555", flexShrink: 0 }}>
            {displayScore}/{file.maxScore}
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "3px 9px", flexShrink: 0, background: badge.bg, color: badge.color }}>{badge.label}</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", background: "#141414" }}>
          {status === "error" ? (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 12, color: "#ef4444" }}>
              {file.error}
            </div>
          ) : status === "unidentified" ? (
            <>
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 12, color: "#ef4444", marginBottom: objectUrl ? 12 : 0 }}>
                Student identity could not be read from this scan. Score recorded as 0/{file.maxScore}.
              </div>
              {objectUrl && (
                isPdf
                  ? <PdfAnnotated objectUrl={objectUrl} results={[]} />
                  : <img src={objectUrl} alt="scan" style={{ width: "100%", borderRadius: 6, border: "1px solid #e4e4e7", display: "block" }} />
              )}
            </>
          ) : (
            <>
              {objectUrl && (
                <div style={{ position: "relative", marginBottom: flagged.length > 0 && !hasBboxes ? 12 : 0 }}>
                  {isPdf ? (
                    <PdfAnnotated objectUrl={objectUrl} results={file.results} />
                  ) : (
                    <>
                      <img src={objectUrl} alt={displayName} style={{ width: "100%", borderRadius: 6, border: "1px solid #e4e4e7", display: "block" }} />
                      {/* Bounding box overlays on images — always page 1 */}
                      {hasBboxes && file.results.map((r) => r.bbox && r.bbox.page === 1 && (
                        <div
                          key={r.label}
                          title={`${r.label}: ${r.read}`}
                          style={{
                            position: "absolute",
                            left:   `${r.bbox.x * 100}%`,
                            top:    `${r.bbox.y * 100}%`,
                            width:  `${r.bbox.w * 100}%`,
                            height: `${r.bbox.h * 100}%`,
                            border: `2px solid ${bboxColor(r.correct)}`,
                            borderRadius: 3,
                            pointerEvents: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <span style={{
                            position: "absolute", bottom: "100%", left: 0,
                            fontSize: 9, fontWeight: 700, lineHeight: 1.2,
                            color: bboxColor(r.correct),
                            background: "rgba(0,0,0,.7)", padding: "1px 4px", borderRadius: 2, whiteSpace: "nowrap",
                          }}>
                            {r.label}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {/* Flagged list — hidden when bboxes are rendered (both PDF canvas and image) */}
              {flagged.length > 0 && !hasBboxes && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: objectUrl ? 12 : 0 }}>
                  {flagged.map((r) => (
                    <div key={r.label} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6,
                      background: r.correct === null ? "rgba(239,68,68,.07)" : "rgba(217,119,6,.07)",
                      border: `1px solid ${r.correct === null ? "rgba(239,68,68,.18)" : "rgba(217,119,6,.18)"}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#4DB832", minWidth: 48, flexShrink: 0 }}>{r.label}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>{r.read || "—"}</span>
                      <span style={{ fontSize: 11, color: r.correct === null ? "#ef4444" : "#D97706", flexShrink: 0 }}>
                        {r.correct === null ? "Unread" : "Wrong"}{r.pts > 1 ? ` −${r.pts}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {flagged.length === 0 && (
                <div style={{ fontSize: 12, color: "#a1a1aa", textAlign: "center", padding: "12px 0" }}>All answers read and graded.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface ResultsMeta {
  title: string
  type: string
  className: string | null
  date: string
  ptsPerQuestion: number
}

function ResultsTable({ results, meta, objectUrls, identities }: {
  results: GradeFileResult[]
  meta: ResultsMeta
  objectUrls: Map<string, string>
  identities: Map<string, IdentityResult>
}) {
  const [activeFilters, setActiveFilters] = useState<Set<StudentStatus>>(new Set())

  function toggleFilter(s: StudentStatus) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const visible = activeFilters.size === 0
    ? results
    : results.filter((f) => activeFilters.has(fileStatus(f, identities.get(f.filename))))

  const hasReview = results.some((f) => fileStatus(f, identities.get(f.filename)) === "needs-review")
  const hasError  = results.some((f) => {
    const s = fileStatus(f, identities.get(f.filename))
    return s === "error" || s === "unidentified"
  })

  function chipStyle(status: StudentStatus) {
    const { color } = STATUS_BADGE[status]
    const on = activeFilters.has(status)
    return {
      padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500 as const, border: "1px solid",
      borderColor: on ? color : "#2a2a2a",
      background: on ? `${color}18` : "none",
      color: on ? color : "#666",
      cursor: "pointer" as const,
    }
  }

  const headerRight = [
    meta.className,
    meta.date,
    meta.ptsPerQuestion === 1 ? "1 pt / question" : `${meta.ptsPerQuestion} pts / question`,
  ].filter(Boolean).join(" · ")

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#71717a" }}>
          Grading results{meta.type || meta.title ? ` — ${[meta.type, meta.title].filter(Boolean).join(": ")}` : ""}
        </span>
        {headerRight && (
          <span style={{ fontSize: 11, color: "#a1a1aa" }}>{headerRight}</span>
        )}
      </div>

      {/* Filter chips */}
      {(hasReview || hasError) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {hasReview && <button style={chipStyle("needs-review")}  onClick={() => toggleFilter("needs-review")}>Needs review</button>}
          {hasError  && <button style={chipStyle("unidentified")} onClick={() => { toggleFilter("error"); toggleFilter("unidentified") }}>Error / Unidentified</button>}
        </div>
      )}

      {/* Table */}
      <div style={{ border: "1px solid #e4e4e7", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", background: "#ffffff", borderBottom: "1px solid #2a2a2a" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#a1a1aa" }}>Student</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#a1a1aa" }}>Status</span>
        </div>
        {visible.map((file) => (
          <StudentRow
            key={file.filename}
            file={file}
            objectUrl={objectUrls.get(file.filename)}
            identity={identities.get(file.filename)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Send panel ────────────────────────────────────────────────────────────
function fuzzyMatch(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
  const na = norm(a), nb = norm(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

function SendPanel({ gradeResults, files, identities, activeClassId, assessmentTitle, assessmentType, sending, setSending, setSendResults }: {
  gradeResults: GradeFileResult[]
  files: UploadFile[]
  identities: Map<string, IdentityResult>
  activeClassId: string | null
  assessmentTitle: string
  assessmentType: string
  sending: boolean
  setSending: (v: boolean) => void
  setSendResults: (v: { email: string; token: string; error?: string }[]) => void
}) {
  const [roster, setRoster] = useState<{ full_name: string; email: string }[]>([])
  const [overrides, setOverrides] = useState<Record<string, string>>({}) // filename → email override for unmatched

  useEffect(() => {
    if (!activeClassId) return
    const sb = createClient()
    sb.from("students").select("full_name, email").eq("class_id", activeClassId)
      .then(({ data }) => setRoster(
        (data ?? []).filter((s): s is { full_name: string; email: string } => !!s.email)
      ))
  }, [activeClassId])

  // Match each graded file to a roster student by name
  const matched = gradeResults.map((f) => {
    const extractedName = identities.get(f.filename)?.name ?? null
    const rosterEntry = extractedName
      ? roster.find((s) => fuzzyMatch(s.full_name, extractedName))
      : null
    return { f, extractedName, email: rosterEntry?.email ?? overrides[f.filename] ?? null, matched: !!rosterEntry }
  })

  const anyEmail = matched.some((m) => m.email)

  async function handleSend() {
    const toSend = matched.filter((m) => m.email)
    if (toSend.length === 0) {
      setSendResults([{ email: "", token: "", error: "No emails to send to — enter an email address above." }])
      return
    }
    setSending(true)
    const students = await Promise.all(
      toSend.map(async (m) => {
        const uf = files.find((u) => u.name === m.f.filename)
        let pdfBase64 = ""
        if (uf) {
          const buf = await uf.file.arrayBuffer()
          const bytes = new Uint8Array(buf)
          let bin = ""
          bytes.forEach((b) => { bin += String.fromCharCode(b) })
          pdfBase64 = btoa(bin)
        }
        return { name: m.extractedName, email: m.email!, gradeResult: m.f, pdfBase64 }
      })
    )
    const res  = await fetch("/api/send-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentTitle, assessmentType, students }),
    })
    const json = await res.json()
    setSendResults(json.results)
    setSending(false)
  }

  const unmatched = matched.filter((m) => !m.matched)
  const readyCount = matched.filter((m) => m.email).length

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionLabel>Send to students</SectionLabel>

      {/* Only show inputs for students not found on the roster */}
      {unmatched.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {unmatched.map(({ f, extractedName }) => (
            <div key={f.filename} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#71717a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {extractedName ?? f.filename.replace(/\.[^.]+$/, "")}
              </span>
              <input
                type="email"
                placeholder="Email (not on roster)"
                value={overrides[f.filename] ?? ""}
                onChange={(e) => setOverrides((p) => ({ ...p, [f.filename]: e.target.value }))}
                style={{ width: 220, border: "1px solid #e4e4e7", borderRadius: 7, padding: "5px 9px", fontSize: 11, background: "#ffffff", color: "#18181b", outline: "none", fontFamily: "inherit" }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        disabled={sending}
        onClick={handleSend}
        style={{ padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: sending ? "#2a2a2a" : "#4DB832", color: sending ? "#555" : "#fff", cursor: sending ? "default" : "pointer" }}
      >
        {sending ? "Sending…" : readyCount > 0 ? `Send corrected paper${readyCount > 1 ? "s" : ""}` : "Send corrected paper"}
      </button>
    </div>
  )
}

// ── Assessment type chips ──────────────────────────────────────────────────
const ASSESSMENT_TYPES = ["Quiz", "Activity", "Seatwork", "Exam", "Long Exam"]

// ── Main component ─────────────────────────────────────────────────────────
export function AnyGradePanel({ activeClassId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const akFileRef = useRef<HTMLInputElement>(null)

  // Student sheets
  const [sheetSource, setSheetSource] = useState<"files" | "scanner" | "phone" | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])

  // Answer key
  const [akSource, setAkSource] = useState<AKSource | null>(null)
  const [akFileName, setAkFileName] = useState<string | null>(null)
  const [akText, setAkText] = useState("")
  const [scanner] = useState<ScannerState>(INITIAL_SCANNER_STATE)

  // Assessment details (auto-filled after upload, teacher can edit)
  const [assessmentTitle, setAssessmentTitle] = useState("")
  const [assessmentType, setAssessmentType] = useState("Quiz")
  const [maxScore, setMaxScore] = useState<number | "">("")
  const detailsVisible = files.length > 0 || akFileName !== null || akText.trim().length > 0

  // Object URLs for scan preview
  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map())

  // Student identity extracted from scan headers
  const [identities, setIdentities] = useState<Map<string, IdentityResult>>(new Map())

  // Class name for results header
  const [className, setClassName] = useState<string | null>(null)
  useEffect(() => {
    if (!activeClassId) { setClassName(null); return }
    const sb = createClient()
    sb.from("classes").select("name, subject").eq("id", activeClassId).single()
      .then(({ data }) => {
        if (data) setClassName([data.name, data.subject].filter(Boolean).join(" · "))
      })
  }, [activeClassId])

  // Batch split
  const [splitting, setSplitting] = useState<string | null>(null)
  const [splitPreviews, setSplitPreviews] = useState<SplitStudent[]>([])
  const [batchDetected, setBatchDetected] = useState<Set<string>>(new Set()) // file IDs confirmed as multi-student

  // Points per question
  const [ptsPerQuestion, setPtsPerQuestion] = useState(1)

  // Grading
  const [grading, setGrading] = useState(false)
  const [gradeResults, setGradeResults] = useState<GradeFileResult[] | null>(null)
  const [gradeError, setGradeError] = useState<string | null>(null)

  // Send to students
  const [sending, setSending] = useState(false)
  const [sendResults, setSendResults] = useState<{ email: string; token: string; error?: string }[] | null>(null)

  const sessionCode = useRef("AG-" + Math.floor(1000 + Math.random() * 9000)).current

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const arr = Array.from(incoming)
    const next: UploadFile[] = arr.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      name: f.name, size: f.size, file: f, status: "ready" as const,
    }))
    setFiles((prev) => [...prev, ...next])
    setObjectUrls((prev) => {
      const map = new Map(prev)
      arr.forEach((f) => { if (!map.has(f.name)) map.set(f.name, URL.createObjectURL(f)) })
      return map
    })
    if (!sheetSource) setSheetSource("files")

    // Detect batch PDFs by sampling the first 2 pages for multiple student names
    arr.filter((f) => f.name.toLowerCase().endsWith(".pdf")).forEach((f) => {
      const uploadId = next.find((u) => u.name === f.name)?.id
      if (!uploadId) return
      const form = new FormData()
      form.append("file", f)
      fetch("/api/detect-batch", { method: "POST", body: form })
        .then((r) => r.json())
        .then(({ isMultiStudent }: { isMultiStudent: boolean }) => {
          if (isMultiStudent) {
            setBatchDetected((prev) => new Set([...prev, uploadId]))
          }
        })
        .catch(() => { /* silent */ })
    })

    // Extract student identity from each file's header
    const form = new FormData()
    arr.forEach((f) => form.append("files", f))
    fetch("/api/extract-identity", { method: "POST", body: form })
      .then((r) => r.json())
      .then(({ results }: { results: IdentityResult[] }) => {
        setIdentities((prev) => {
          const next = new Map(prev)
          results.forEach((r) => next.set(r.filename, r))
          return next
        })
        // Auto-fill assessment details from first result if not yet set
        const first = results[0]
        if (first) {
          if (first.section) setAssessmentTitle((t) => t || "")
        }
      })
      .catch(() => { /* silent — grading still works without identity */ })
  }, [sheetSource])

  // Called when teacher clicks "Split" on a batch PDF already in the file list
  async function splitBatch(uploadFile: UploadFile) {
    setSplitting(uploadFile.name)
    setSplitPreviews([])
    try {
      const form = new FormData()
      form.append("file", uploadFile.file)
      const res  = await fetch("/api/split-batch", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Split failed")
      setSplitPreviews(json.students as SplitStudent[])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Split failed")
    } finally {
      setSplitting(null)
    }
  }

  // Teacher confirms the split preview — replace the batch file with per-student File objects
  function confirmSplit(batchFile: UploadFile) {
    // Build File objects from base64 slices
    const sliceFiles: UploadFile[] = splitPreviews.map((s, i) => {
      const bytes  = Uint8Array.from(atob(s.pdfBase64), (c) => c.charCodeAt(0))
      const blob   = new Blob([bytes], { type: "application/pdf" })
      const safeName = (s.name ?? `Student ${i + 1}`).replace(/[^a-zA-Z0-9_, .-]/g, "")
      const fname  = `${safeName}.pdf`
      const file   = new File([blob], fname, { type: "application/pdf" })
      return {
        id: `split-${i}-${Date.now()}`,
        name: fname,
        size: file.size,
        file,
        status: "ready" as const,
      }
    })

    // Replace the batch entry with the slices
    setFiles((prev) => {
      const without = prev.filter((f) => f.id !== batchFile.id)
      return [...without, ...sliceFiles]
    })

    // Revoke old object URL, create new ones
    setObjectUrls((prev) => {
      const next = new Map(prev)
      const old = next.get(batchFile.name)
      if (old) URL.revokeObjectURL(old)
      next.delete(batchFile.name)
      sliceFiles.forEach((f) => { next.set(f.name, URL.createObjectURL(f.file)) })
      return next
    })

    // Seed identities from split metadata (name + section already known)
    setIdentities((prev) => {
      const next = new Map(prev)
      splitPreviews.forEach((s, i) => {
        const fname = sliceFiles[i].name
        next.set(fname, {
          filename:   fname,
          name:       s.name,
          studentId:  null,
          section:    s.section,
          date:       null,
          department: null,
        })
      })
      return next
    })

    setSplitPreviews([])
  }

  useEffect(() => {
    return () => { objectUrls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [objectUrls])

  function removeFile(id: string) {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id)
      if (removed) {
        setObjectUrls((urls) => {
          const next = new Map(urls)
          const url = next.get(removed.name)
          if (url) URL.revokeObjectURL(url)
          next.delete(removed.name)
          return next
        })
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  function handleAKFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAkFileName(f.name)
    // For text files, read content directly into akText so the parser can use it
    if (f.type === "text/plain" || f.name.endsWith(".txt") || f.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (ev) => setAkText((ev.target?.result as string) ?? "")
      reader.readAsText(f)
    }
  }

  const parsedProblems = parseAnswerKeyText(akText)
  const problems = parsedProblems.map((p) => ({ ...p, pts: p.pts ?? ptsPerQuestion }))
  const answerKeyReady = akSource === "file" ? (akFileName !== null && problems.length > 0) : problems.length > 0
  const canGrade = files.length > 0 && answerKeyReady && !grading && !gradeResults

  const akStatusLabel = !akSource ? "not set"
    : akSource === "quiz" ? "from AnyQuiz"
    : akSource === "scan" ? "scanned"
    : akSource === "photo" ? "photo taken"
    : akSource === "file" ? (akFileName ? "file uploaded" : "not set")
    : problems.length > 0 ? `${problems.length} problems` : "not set"

  async function handleGrade() {
    if (!canGrade) return
    setGrading(true)
    setGradeError(null)
    setGradeResults(null)
    const form = new FormData()
    form.append("problems", JSON.stringify(problems))
    files.forEach((f) => form.append("files", f.file))
    try {
      const res = await fetch("/api/grade", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Grade request failed")
      const fileResults: GradeFileResult[] = json.fileResults
      setGradeResults(fileResults)

      // Persist to Supabase when a class is selected
      if (activeClassId) {
        const sb = createClient()
        const typeMap: Record<string, string> = {
          Quiz: "quiz", Activity: "activity", Seatwork: "seatwork",
          Exam: "exam", "Long Exam": "long_exam",
        }
        const { data: assessment } = await sb.from("assessments").insert({
          class_id: activeClassId,
          title: assessmentTitle || "Untitled",
          type: (typeMap[assessmentType] ?? "quiz") as "quiz" | "activity" | "seatwork" | "exam" | "long_exam" | "lab_report" | "recitation" | "project",
          total_items: problems.length,
          max_score: maxScore || problems.reduce((s, p) => s + p.pts, 0),
          conducted_at: new Date().toISOString().slice(0, 10),
        }).select("id").single()

        if (assessment) {
          const submissions = fileResults.map((f) => ({
            assessment_id: assessment.id,
            student_id: null as unknown as string,
            raw_score: f.rawScore,
            ocr_result: f as unknown as Record<string, unknown>,
            graded_at: new Date().toISOString(),
          }))
          // student_id is required FK — skip insert until batch split pipeline lands
          // await sb.from("submissions").insert(submissions)
          console.log("[AnyGrade] assessment saved:", assessment.id, "submissions pending student identity:", submissions.length)
        }
      }
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setGrading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Details bar — hidden until sheets or AK is loaded */}
      {detailsVisible && (
        <div style={{ padding: "14px 32px", borderBottom: "1px solid #1c1c1c", background: "#f9fafb", flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#71717a" }}>Assessment title</div>
            <input
              type="text"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. Quiz 3 – Kinematics"
              style={{ border: "1px solid #e4e4e7", borderRadius: 7, padding: "6px 10px", fontSize: 12, background: "#ffffff", color: "#18181b", outline: "none", width: 240, fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#71717a" }}>Type</div>
            <div style={{ display: "flex", gap: 5 }}>
              {ASSESSMENT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAssessmentType(t)}
                  style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid",
                    borderColor: assessmentType === t ? "#4DB832" : "#2a2a2a",
                    background: assessmentType === t ? "rgba(77,184,50,.1)" : "none",
                    color: assessmentType === t ? "#4DB832" : "#666", cursor: "pointer", transition: "all .15s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#71717a" }}>Max score</div>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="50"
              style={{ border: "1px solid #e4e4e7", borderRadius: 7, padding: "6px 10px", fontSize: 12, background: "#ffffff", color: "#18181b", outline: "none", width: 80, fontFamily: "inherit" }}
            />
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 32px 0" }}>

        {/* ── Student answer sheets ── */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Student answer sheets</SectionLabel>

          {/* Source cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <SrcCard
              selected={sheetSource === "files"}
              onClick={() => { setSheetSource("files"); if (sheetSource !== "files") fileInputRef.current?.click() }}
              icon={<IconFiles />}
              title="Files on device"
              desc="Upload individual sheets or full batches from your computer."
            />
            <SrcCard
              selected={sheetSource === "scanner"}
              onClick={() => setSheetSource("scanner")}
              icon={<IconScanner />}
              title="Dedicated scanner"
              desc="Sheet-fed ADF scanner. Grades in real time as sheets feed through."
              badge={
                <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", padding: "2px 8px", borderRadius: 8, background: "rgba(77,184,50,.15)", color: "#4DB832" }}>
                  EPSON ES-400 · Ready
                </span>
              }
            />
            <SrcCard
              selected={sheetSource === "phone"}
              onClick={() => setSheetSource("phone")}
              icon={<IconPhone />}
              title="Phone camera"
              desc="Capture with your phone and transfer over WiFi Direct — no internet."
              badge={
                <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", padding: "2px 8px", borderRadius: 8, background: "rgba(77,184,50,.1)", color: "#4DB832" }}>
                  Juan&apos;s iPhone · Paired
                </span>
              }
            />
          </div>

          {/* Context for selected source */}
          {sheetSource === "files" && (
            <div>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.heic,.pdf" style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
              {files.length === 0 ? (
                <div
                  className={dragActive ? "drop-zone-active" : ""}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragActive ? "#4DB832" : "#2a2a2a"}`, borderRadius: 10, padding: "28px 24px", textAlign: "center", cursor: "pointer", transition: "border-color .15s" }}
                >
                  <svg style={{ width: 32, height: 32, color: "#a1a1aa", margin: "0 auto 10px", display: "block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 15V4M12 4L8 8M12 4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 13, color: "#ccc" }}>
                    Drop student answer sheets here, or{" "}
                    <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} style={{ background: "none", border: "none", color: "#4DB832", cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline" }}>
                      browse
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>Individual sheets or full batches — JPG · PNG · HEIC · PDF</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {files.map((f) => {
                    const isBatchPdf = batchDetected.has(f.id)
                    const isSplitting = splitting === f.name
                    return (
                      <div key={f.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderRadius: 8, background: "#ffffff" }}>
                          <span style={{ flex: 1, fontSize: 13, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                          <span style={{ fontSize: 11, color: "#a1a1aa", flexShrink: 0 }}>{formatBytes(f.size)}</span>
                          {isBatchPdf && splitPreviews.length === 0 && (
                            <button
                              onClick={() => splitBatch(f)}
                              disabled={isSplitting}
                              style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "2px 10px", flexShrink: 0, background: isSplitting ? "#2a2a2a" : "rgba(77,184,50,.15)", color: isSplitting ? "#555" : "#4DB832", border: "1px solid", borderColor: isSplitting ? "#2a2a2a" : "#4DB832", cursor: isSplitting ? "default" : "pointer" }}
                            >
                              {isSplitting ? "Splitting…" : "Split batch"}
                            </button>
                          )}
                          {!isBatchPdf && (
                            <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "2px 8px", flexShrink: 0, background: "rgba(77,184,50,.18)", color: "#4DB832" }}>Ready</span>
                          )}
                          <button onClick={() => removeFile(f.id)} style={{ background: "none", border: "none", color: "#a1a1aa", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                        </div>

                        {/* Split preview — shown below the batch file while pending confirmation */}
                        {isBatchPdf && splitPreviews.length > 0 && (
                          <div style={{ marginTop: 4, padding: "12px 14px", background: "#141414", borderRadius: 8, border: "1px solid #e4e4e7" }}>
                            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 10, fontWeight: 600 }}>
                              {splitPreviews.length} students detected — confirm to split
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                              {splitPreviews.map((s, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                                  <span style={{ color: "#71717a", minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
                                  <span style={{ color: "#ccc", flex: 1 }}>{s.name ?? <span style={{ color: "#a1a1aa" }}>Unidentified</span>}</span>
                                  {s.section && <span style={{ color: "#a1a1aa" }}>{s.section}</span>}
                                  <span style={{ color: "#a1a1aa" }}>pp {s.startPage}–{s.endPage}</span>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => confirmSplit(f)}
                                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#4DB832", color: "#18181b", border: "none", cursor: "pointer" }}
                              >
                                Confirm split
                              </button>
                              <button
                                onClick={() => setSplitPreviews([])}
                                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: "none", color: "#71717a", border: "1px solid #e4e4e7", cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "1px dashed #2a2a2a", borderRadius: 8, color: "#71717a", fontSize: 12, padding: "8px 14px", cursor: "pointer", textAlign: "left", marginTop: 4 }}>
                    + Add more sheets
                  </button>
                </div>
              )}
            </div>
          )}

          {sheetSource === "scanner" && (
            <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", flexShrink: 0, animation: "ag-pulse 1.4s ease-in-out infinite" }} />
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>EPSON ES-400</div>
                <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>USB · Ready · ADF 50-sheet capacity</div>
              </div>
            </div>
          )}

          {sheetSource === "phone" && (
            <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#e4e4e7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📱</div>
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>Juan&apos;s iPhone 15</div>
                <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>WiFi Direct · Session: <span style={{ fontFamily: "monospace" }}>{sessionCode}</span></div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", flexShrink: 0, marginLeft: "auto" }} />
            </div>
          )}
        </div>

        {/* ── Answer key / solution ── */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Answer key / solution</SectionLabel>

          {/* Source cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <SrcCard
              selected={akSource === "quiz"}
              onClick={() => { setAkSource("quiz") }}
              icon={<IconQuizLink />}
              title="From AnyQuiz"
              desc="Use a key generated in AnyQuiz. Auto-linked to this assessment."
            />
            <SrcCard
              selected={akSource === "file"}
              onClick={() => { setAkSource("file"); if (akSource !== "file") akFileRef.current?.click() }}
              icon={<IconUpload />}
              title="File upload"
              desc="Upload your answer key — numbered list, filled sheet, PDF, or Word."
            />
            <SrcCard
              selected={akSource === "scan"}
              onClick={() => setAkSource("scan")}
              icon={<IconScanner />}
              title="Scan key"
              desc="Scan a printed answer key sheet using the dedicated scanner."
            />
            <SrcCard
              selected={akSource === "photo"}
              onClick={() => setAkSource("photo")}
              icon={<IconCamera />}
              title="Photo of solutions"
              desc="Photo of handwritten solutions via your paired phone."
            />
          </div>

          {/* Context: manual text entry (quiz / no source selected) */}
          {(akSource === null || akSource === "quiz") && (
            <div>
              <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 8 }}>
                Or type answers below — one per line: <span style={{ color: "#71717a", fontFamily: "monospace" }}>label | expected answer</span> or <span style={{ color: "#71717a", fontFamily: "monospace" }}>label | expected | pts</span>
              </div>
              <textarea
                value={akText}
                onChange={(e) => setAkText(e.target.value)}
                placeholder={"1.301 | ρ = 5333.33 ft | 5\n1.302 | a = 6.83 ft/s² | 5\nQ1 | v = 12 m/s upward"}
                rows={5}
                style={{ width: "100%", background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: 8, color: "#18181b", fontSize: 12, padding: "10px 12px", outline: "none", resize: "vertical", fontFamily: "monospace", boxSizing: "border-box", lineHeight: 1.6 }}
              />
              {problems.length > 0 && (
                <div style={{ fontSize: 11, color: "#4DB832", marginTop: 6 }}>
                  {problems.length} problem{problems.length !== 1 ? "s" : ""} ready · max {problems.reduce((s, p) => s + p.pts, 0)} pts
                </div>
              )}
            </div>
          )}

          {akSource === "file" && (
            <div>
              <input ref={akFileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.txt,.doc,.docx,.xls,.xlsx" style={{ display: "none" }} onChange={handleAKFile} />
              <div
                onClick={() => akFileRef.current?.click()}
                style={{ border: "1.5px dashed #2a2a2a", borderRadius: 10, padding: "20px 24px", textAlign: "center", cursor: "pointer" }}
              >
                {akFileName ? (
                  <span style={{ fontSize: 13, color: "#4DB832" }}>{akFileName}</span>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: "#ccc" }}>
                      Drop answer key here, or{" "}
                      <button onClick={(e) => { e.stopPropagation(); akFileRef.current?.click() }} style={{ background: "none", border: "none", color: "#4DB832", cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline" }}>browse</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>JPG · PNG · PDF · Word · Excel · TXT</div>
                  </>
                )}
              </div>
            </div>
          )}

          {akSource === "scan" && (
            <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: scanner.status === "ready" ? "#4DB832" : scanner.status === "error" ? "#ef4444" : "#D97706",
                animation: scanner.status !== "ready" ? "ag-pulse 1.4s ease-in-out infinite" : "none",
              }} />
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{scanner.name ?? "Waiting for scanner…"}</div>
                {scanner.name ? (
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>{[scanner.connectionType, scanner.statusLabel, scanner.capability].filter(Boolean).join(" · ")}</div>
                ) : (
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>Connect a scanner and place the answer key face-down.</div>
                )}
              </div>
            </div>
          )}

          {akSource === "photo" && (
            <div style={{ padding: "14px 16px", background: "#ffffff", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Open AnyGrade on your phone", "Tap Scan answer key and point at the key sheet"].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#ccc" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#e4e4e7", color: "#71717a", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ width: 64, height: 64, background: "#e4e4e7", borderRadius: 6 }} />
                <span style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "monospace" }}>Session: {sessionCode}</span>
              </div>
            </div>
          )}

          {/* PTS / QUESTION — shown only after grading is complete */}
          {gradeResults !== null && akSource !== "quiz" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "#71717a", flexShrink: 0 }}>Pts / question</label>
              <input
                type="number"
                min={1}
                value={ptsPerQuestion}
                onChange={(e) => setPtsPerQuestion(Math.max(1, Number(e.target.value) || 1))}
                style={{ border: "1px solid #e4e4e7", borderRadius: 7, padding: "5px 9px", fontSize: 12, background: "#ffffff", color: "#18181b", outline: "none", width: 70, fontFamily: "inherit" }}
              />
              {problems.length > 0 && (
                <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                  max {problems.reduce((s, p) => s + p.pts, 0)} pts
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Grading results ── */}
        {(gradeResults || gradeError || grading) && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Grading Results</SectionLabel>
            {grading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#71717a" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", animation: "ag-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
                Grading {files.length} {files.length === 1 ? "sheet" : "sheets"}…
              </div>
            )}
            {gradeError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 12, color: "#ef4444" }}>
                {gradeError}
              </div>
            )}
            {gradeResults && (
              <ResultsTable
                results={gradeResults}
                meta={{
                  title: assessmentTitle,
                  type: assessmentType,
                  className: className ?? (identities.size > 0 ? Array.from(identities.values())[0]?.section ?? null : null),
                  date: new Date().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
                  ptsPerQuestion,
                }}
                objectUrls={objectUrls}
                identities={identities}
              />
            )}
          </div>
        )}

        {/* ── Send to students ── */}
        {gradeResults && !sendResults && (
          <SendPanel
            gradeResults={gradeResults}
            files={files}
            identities={identities}
            activeClassId={activeClassId}
            assessmentTitle={assessmentTitle}
            assessmentType={assessmentType}
            sending={sending}
            setSending={setSending}
            setSendResults={setSendResults}
          />
        )}

        {sendResults && (
          <div style={{ marginBottom: 32 }}>
            <SectionLabel>Send to students</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sendResults.map((r) => (
                <div key={r.email} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <span style={{ color: r.error ? "#ef4444" : "#4DB832", flexShrink: 0 }}>{r.error ? "✗" : "✓"}</span>
                  <span style={{ color: "#ccc" }}>{r.email}</span>
                  {r.error && <span style={{ color: "#ef4444" }}>{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 32px", borderTop: "1px solid #e4e4e7", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#a1a1aa" }}>
          {files.length > 0 ? `${files.length} ${files.length === 1 ? "sheet" : "sheets"}` : "no sheets"} · answer key: {akStatusLabel}
        </span>
        {gradeResults && (
          <button
            onClick={() => { setGradeResults(null); setFiles([]); setAkText(""); setAkFileName(null) }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e4e4e7", background: "none", color: "#71717a", fontSize: 12, cursor: "pointer" }}
          >
            New session
          </button>
        )}
        <button
          disabled={!canGrade}
          onClick={handleGrade}
          style={{
            marginLeft: "auto", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
            background: canGrade ? "#4DB832" : "#2a2a2a",
            color: canGrade ? "#fff" : "#555",
            cursor: canGrade ? "pointer" : "default",
          }}
        >
          {grading ? "Grading…" : `Grade ${files.length || ""} ${files.length === 1 ? "sheet" : "sheets"}`.trim()}
        </button>
      </div>
    </div>
  )
}

