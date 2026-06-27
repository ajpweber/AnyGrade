"use client"

import { useRef, useState, useCallback } from "react"
import type { AKSource, UploadFile, ScannerState } from "../types"
import { formatBytes, INITIAL_SCANNER_STATE } from "../types"
import type { GradeFileResult } from "@/app/api/grade/route"
import type { ExtractKeyItem, ExtractKeyResult } from "@/app/api/extract-key/route"

type Props = {
  activeClassId?: string | null
}

// Strips file extension and slug-style underscores; returns "Student" if the
// value looks like a generated filename rather than a real person's name.
function cleanDisplayName(raw: string | null | undefined): string {
  if (!raw) return "Student"
  const stripped = raw.replace(/\.[a-zA-Z0-9]+$/, "")
  if (!stripped.includes(" ") && stripped.includes("_")) return "Student"
  return stripped
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
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#aaa", marginBottom: 14 }}>
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
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.55 }}>{desc}</div>
      {badge && <div style={{ marginTop: 10 }}>{badge}</div>}
    </button>
  )
}

// ── No-key modal ───────────────────────────────────────────────────────────
function NoKeyModal({ onAutofill, onCancel }: { onAutofill: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, width: 380, padding: "22px 22px 18px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>No answer key found in this document.</div>
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>The document appears to contain questions only, with no answers.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onAutofill}
            style={{ flex: 1, padding: "9px 14px", borderRadius: 7, border: "none", background: "#4DB832", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}
          >
            Autofill answer key / solution →
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "9px 14px", borderRadius: 7, border: "1px solid #2a2a2a", background: "none", color: "#666", fontSize: 12, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Answer key table modal ──────────────────────────────────────────────────
function KeyTableModal({
  items,
  warnings,
  onConfirm,
  onClose,
}: {
  items: ExtractKeyItem[]
  warnings: string[]
  onConfirm: (confirmed: ExtractKeyItem[]) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState<ExtractKeyItem[]>(items)
  function update(num: number, answer: string) {
    setRows((prev) => prev.map((r) => (r.num === num ? { ...r, answer } : r)))
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, width: 520, display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #1c1c1c", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Answer key</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }} aria-label="close">×</button>
        </div>
        <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>
          {warnings.length > 0 && (
            <div style={{ padding: "6px 10px", background: "rgba(217,119,6,.07)", borderLeft: "2px solid rgba(217,119,6,.35)", borderRadius: "0 4px 4px 0", fontSize: 10, color: "#c98a00", marginBottom: 10 }}>
              {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}
          <div style={{ border: "1px solid #1c1c1c", borderRadius: 6, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#111" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 10, borderBottom: "1px solid #1c1c1c", width: 36 }}>#</th>
                  <th style={{ padding: "6px 10px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 10, borderBottom: "1px solid #1c1c1c" }}>Question</th>
                  <th style={{ padding: "6px 10px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 10, borderBottom: "1px solid #1c1c1c", width: 90 }}>Answer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.num} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{ padding: "5px 10px", color: "#444", fontWeight: 600, fontSize: 10 }}>{r.num}</td>
                    <td style={{ padding: "5px 10px", fontSize: 10, color: "#666", lineHeight: 1.35 }}>{r.question ?? ""}</td>
                    <td style={{ padding: "3px 6px" }}>
                      <input
                        value={r.answer}
                        onChange={(e) => update(r.num, e.target.value)}
                        style={{ width: "100%", background: "transparent", border: "1px solid transparent", borderRadius: 3, color: "#4DB832", fontSize: 11, padding: "2px 4px", outline: "none", fontFamily: "monospace" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.background = "#1a1a1a" }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 18px", borderTop: "1px solid #1c1c1c", flexShrink: 0 }}>
          <button
            onClick={() => onConfirm(rows)}
            style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "#4DB832", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Answer key text parser ──────────────────────────────────────────────────
function parseAnswerKeyText(text: string): { label: string; expected: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const sep = l.indexOf("|")
      if (sep === -1) return null
      return { label: l.slice(0, sep).trim(), expected: l.slice(sep + 1).trim() }
    })
    .filter((x): x is { label: string; expected: string } => x !== null && x.label !== "" && x.expected !== "")
}

// ── Results table ──────────────────────────────────────────────────────────
type ExtendedGradeFileResult = GradeFileResult & { needsManual?: string[]; pdfUrl?: string }

type StudentStatus = "graded" | "needs-review" | "error"

function studentStatus(file: ExtendedGradeFileResult): StudentStatus {
  if (file.error) return "error"
  if (file.results.some((r) => r.correct === null)) return "needs-review"
  return "graded"
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const styles: Record<StudentStatus, { bg: string; color: string; label: string }> = {
    "graded":       { bg: "rgba(77,184,50,.12)",   color: "#4DB832", label: "Graded" },
    "needs-review": { bg: "rgba(217,119,6,.12)",   color: "#D97706", label: "Needs review" },
    "error":        { bg: "rgba(239,68,68,.12)",   color: "#ef4444", label: "Error" },
  }
  const s = styles[status]
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".04em", borderRadius: 4, padding: "2px 8px", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function StudentRow({ file, assessmentTitle, assessmentType, activeClassId }: {
  file: ExtendedGradeFileResult
  assessmentTitle: string
  assessmentType: string
  activeClassId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const status   = studentStatus(file)
  const rawScore = file.rawScore ?? 0
  const maxScore = file.maxScore ?? 0
  const name     = cleanDisplayName(file.studentName ?? file.filename)

  async function handleSend() {
    if (!email || sending) return
    setSending(true)
    try {
      // Convert the object URL to base64 so the server can store the actual scan
      let pdfBase64 = ""
      if (file.pdfUrl) {
        const blob = await fetch(file.pdfUrl).then((r) => r.blob())
        const buf  = new Uint8Array(await blob.arrayBuffer())
        let binary = ""
        for (let i = 0; i < buf.length; i += 8192) {
          binary += String.fromCharCode(...buf.subarray(i, i + 8192))
        }
        pdfBase64 = btoa(binary)
      }
      const res = await fetch("/api/send-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentTitle: assessmentTitle || "Assessment",
          assessmentType,
          students: [{ name: cleanDisplayName(file.studentName ?? file.filename), email, gradeResult: file, pdfBase64 }],
        }),
      })
      if (res.ok) setSent(true)
    } catch { /* swallow */ }
    setSending(false)
  }

  return (
    <div style={{ border: `1px solid ${status === "needs-review" ? "#3a2a10" : status === "error" ? "#3a1010" : "#222"}`, borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      {/* Header row */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: "#161616" }}
      >
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {status !== "error" && (
          <span style={{
            fontSize: 13, fontWeight: 700, borderRadius: 6, padding: "3px 10px",
            background: status === "graded" ? "rgba(77,184,50,.1)" : "rgba(217,119,6,.1)",
            color: status === "graded" ? "#4DB832" : "#D97706",
          }}>
            {rawScore} / {maxScore}
          </span>
        )}
        <StatusBadge status={status} />
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: "1px solid #222", padding: "16px" }}>
          {status === "error" && (
            <div style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,.08)", borderRadius: 6, marginBottom: 12 }}>
              {file.error}
            </div>
          )}
          {/* Annotated PDF */}
          {file.pdfUrl && (
            <div style={{ marginBottom: 16 }}>
              <PdfAnnotated objectUrl={file.pdfUrl} results={file.results} />
            </div>
          )}
          {file.needsManual && file.needsManual.length > 0 && (
            <div style={{ padding: "8px 12px", background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.2)", borderRadius: 6, fontSize: 11, color: "#D97706", marginBottom: 6 }}>
              Manual entry needed for Q{file.needsManual.join(", Q")}
            </div>
          )}
          {file.error ? (
            <div style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,.08)", borderRadius: 6 }}>
              Error: {file.error}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  <th style={{ textAlign: "left", padding: "6px 10px", color: "#666", fontWeight: 600 }}>Problem</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", color: "#666", fontWeight: 600 }}>Read</th>
                  <th style={{ textAlign: "center", padding: "6px 10px", color: "#666", fontWeight: 600 }}>Result</th>
                  <th style={{ textAlign: "center", padding: "6px 10px", color: "#666", fontWeight: 600 }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {file.results.map((r) => (
                  <tr key={r.label} style={{ borderBottom: "1px solid #1c1c1c" }}>
                    <td style={{ padding: "8px 10px", color: "#4DB832", fontWeight: 600 }}>{r.label}</td>
                    <td style={{ padding: "8px 10px", color: "#ccc" }}>{r.read}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {r.correct === true
                        ? <span style={{ color: "#4DB832", fontWeight: 700 }}>✓</span>
                        : r.correct === false
                        ? <span style={{ color: "#ef4444", fontWeight: 700 }}>✗</span>
                        : <span style={{ color: "#D97706", fontWeight: 700 }}>?</span>}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "2px 7px",
                        background: r.confidence === "high" ? "rgba(77,184,50,.15)" : r.confidence === "medium" ? "rgba(217,119,6,.15)" : "rgba(239,68,68,.12)",
                        color: r.confidence === "high" ? "#4DB832" : r.confidence === "medium" ? "#D97706" : "#ef4444",
                      }}>
                        {r.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ResultsTable({ results, assessmentTitle, assessmentType, activeClassId }: {
  results: ExtendedGradeFileResult[]
  assessmentTitle: string
  assessmentType: string
  activeClassId: string | null
}) {
  const anyNeedsReview = results.some((r) => studentStatus(r) === "needs-review")
  const detectedItems = results[0]?.results.length ?? 0
  const detectedMax   = results[0]?.maxScore ?? 0
  const detectedPts   = detectedItems > 0 ? Math.round(detectedMax / detectedItems) : 1
  const [numQuestions, setNumQuestions] = useState(detectedItems || 0)
  const [ptsPerQuestion, setPtsPerQuestion] = useState(detectedPts || 1)
  const totalPts = numQuestions * ptsPerQuestion

  const inputStyle: React.CSSProperties = {
    width: 44, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5,
    color: "#ccc", fontSize: 11, padding: "2px 6px", textAlign: "center", fontFamily: "inherit",
    outline: "none", MozAppearance: "textfield",
  }

  return (
    <div>
      {anyNeedsReview && (
        <div style={{ padding: "8px 14px", background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.2)", borderRadius: 8, fontSize: 12, color: "#D97706", marginBottom: 14 }}>
          Some answers need manual review — marked with ?
        </div>
      )}
      <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
      <div style={{ padding: "6px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number" min={1} value={numQuestions || ""}
            onChange={(e) => setNumQuestions(Math.max(1, Number(e.target.value)))}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            style={{ ...inputStyle, width: 36 }}
          />
          <span style={{ color: "#555", fontWeight: 600, letterSpacing: ".06em" }}>ITEM ·</span>
          <input
            type="number" min={1} value={ptsPerQuestion || ""}
            onChange={(e) => setPtsPerQuestion(Math.max(1, Number(e.target.value)))}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            style={inputStyle}
          />
          <span style={{ color: "#555", fontWeight: 600, letterSpacing: ".06em" }}>PTS/ITEM ·</span>
          <span style={{ color: "#666", fontWeight: 600, letterSpacing: ".06em" }}>{totalPts} PTS TOTAL</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "4px 16px", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#555", flex: 1 }}>Student</span>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#555", marginRight: 12 }}>Score</span>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#555" }}>Status</span>
      </div>
      {results.map((file) => (
        <StudentRow key={file.filename} file={file} assessmentTitle={assessmentTitle} assessmentType={assessmentType} activeClassId={activeClassId} />
      ))}
    </div>
  )
}

// ── Assessment type chips ──────────────────────────────────────────────────
const ASSESSMENT_TYPES = ["Quiz", "Activity", "Seatwork", "Exam", "Long Exam"]

// ── Main component ─────────────────────────────────────────────────────────
export function AnyGradePanel(_props: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const akFileRef = useRef<HTMLInputElement>(null)

  // Student sheets
  const [sheetSource, setSheetSource] = useState<"files" | "scanner" | "phone" | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [zipgradeMode, setZipgradeMode] = useState(false)
  const [hasHandwritten, setHasHandwritten] = useState(false)
  const [zipgradeDetected, setZipgradeDetected] = useState<"auto" | "manual" | null>(null)

  // Answer key
  const [akSource, setAkSource] = useState<AKSource | null>(null)
  const [akFileName, setAkFileName] = useState<string | null>(null)
  const [akText, setAkText] = useState("")
  const [scanner] = useState<ScannerState>(INITIAL_SCANNER_STATE)

  // Extraction state
  type ExtractionState = "idle" | "extracting" | "review" | "confirmed" | "no-key"
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle")
  const [extractedItems, setExtractedItems] = useState<ExtractKeyItem[]>([])
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([])
  const [confirmedItems, setConfirmedItems] = useState<ExtractKeyItem[] | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [prevQuestionNums, setPrevQuestionNums] = useState<number[] | null>(null)

  // Assessment details (auto-filled after upload, teacher can edit)
  const [assessmentTitle, setAssessmentTitle] = useState("")
  const [assessmentType, setAssessmentType] = useState("Quiz")
  const [maxScore, setMaxScore] = useState<number | "">("")
  const detailsVisible = files.length > 0 || akFileName !== null || akText.trim().length > 0

  // Grading
  const [grading, setGrading] = useState(false)
  const [gradeResults, setGradeResults] = useState<ExtendedGradeFileResult[] | null>(null)
  const [gradeError, setGradeError] = useState<string | null>(null)

  const [sessionCode] = useState(() => "AG-" + Math.floor(1000 + Math.random() * 9000))

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const next: UploadFile[] = Array.from(incoming).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      name: f.name, size: f.size, file: f, status: "ready" as const,
    }))
    setFiles((prev) => {
      // Only auto-detect on first batch (when list was empty)
      if (prev.length === 0 && next.length > 0) {
        const first = incoming[0]
        const fd = new FormData()
        fd.append("file", first)
        fetch("/api/detect-sheet", { method: "POST", body: fd })
          .then((r) => r.json())
          .then(({ isZipGrade, hasHandwritten: hw }) => {
            setZipgradeMode(!!isZipGrade)
            setHasHandwritten(!!hw)
            setZipgradeDetected("auto")
          })
          .catch(() => {})
      }
      return [...prev, ...next]
    })
    if (!sheetSource) setSheetSource("files")
  }, [sheetSource])

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleAKFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAkFileName(f.name)
    setExtractionState("idle")
    setConfirmedItems(null)
    setExtractionError(null)

    if (f.type === "text/plain" || f.name.endsWith(".txt") || f.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (ev) => setAkText((ev.target?.result as string) ?? "")
      reader.readAsText(f)
      return
    }

    // PDF or image — detect then extract
    const isPdf = f.type === "application/pdf" || f.name.endsWith(".pdf")
    const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|heic)$/i.test(f.name)
    if (!isPdf && !isImage) return // DOCX etc — handled gracefully server-side

    setExtractionState("extracting")
    const form = new FormData()
    form.append("file", f)

    // Auto-detect: if it's a ZipGrade bubble sheet used as an answer key, read via OMR
    const detectRes = await fetch("/api/detect-sheet", { method: "POST", body: form })
    if (detectRes.ok) {
      const { isZipGrade } = await detectRes.json()
      if (isZipGrade) {
        setZipgradeMode(true)
        setZipgradeDetected("auto")
        // Read the filled bubbles as the answer key
        const omrRes = await fetch("/api/omr", { method: "POST", body: form })
        const omrData = await omrRes.json()
        const items = Object.entries(omrData.answers ?? {})
          .filter(([, v]) => v !== null)
          .map(([num, answer]) => ({ num: Number(num), answer: answer as string }))
          .sort((a, b) => a.num - b.num)
        setExtractedItems(items)
        setExtractionWarnings(omrData.warnings ?? [])
        setExtractionState(items.length > 0 ? "review" : "no-key")
        return
      }
    }

    try {
      const res = await fetch("/api/extract-key", { method: "POST", body: form })
      const data: ExtractKeyResult & { error?: string } = await res.json()
      if (!res.ok || data.error) {
        setExtractionError(data.error ?? "Extraction failed")
        setExtractionState("idle")
        return
      }
      if (!data.hasAnswers || data.items.length === 0) {
        // Store question nums for potential sync check on next upload
        setPrevQuestionNums(data.questionNums ?? [])
        setExtractionState("no-key")
        return
      }

      // Sync check: second upload is key-only and we have question nums from a prior upload
      const warnings = [...(data.warnings ?? [])]
      if (data.sourceType === "key-only" && prevQuestionNums && prevQuestionNums.length > 0) {
        const keyNums = new Set(data.items.map((i) => i.num))
        const missing = prevQuestionNums.filter((n) => !keyNums.has(n))
        const extra = [...keyNums].filter((n) => !prevQuestionNums.includes(n))
        if (missing.length > 0) warnings.push(`Key is missing questions found in the questionnaire: ${missing.join(", ")}`)
        if (extra.length > 0) warnings.push(`Key has questions not found in the questionnaire: ${extra.join(", ")}`)
      }

      // Composite replaces everything — clear stored sequence
      if (data.sourceType === "composite") setPrevQuestionNums(null)

      setExtractedItems(data.items)
      setExtractionWarnings(warnings)
      setExtractionState("review")
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Unknown error")
      setExtractionState("idle")
    }
  }

  function handleConfirmExtracted(items: ExtractKeyItem[]) {
    setConfirmedItems(items)
    setExtractionState("confirmed")
  }

  function handleDiscardExtracted() {
    setAkFileName(null)
    setExtractedItems([])
    setConfirmedItems(null)
    setExtractionState("idle")
    setExtractionError(null)
    setPrevQuestionNums(null)
    if (akFileRef.current) akFileRef.current.value = ""
  }

  const textProblems = parseAnswerKeyText(akText)
  const extractedProblems = confirmedItems
    ? confirmedItems.map((i) => ({ label: String(i.num), expected: i.answer }))
    : []
  const problems = extractedProblems.length > 0 ? extractedProblems : textProblems
  const answerKeyReady = akSource === "file"
    ? (extractionState === "confirmed" && confirmedItems !== null && confirmedItems.length > 0) || (akFileName !== null && textProblems.length > 0)
    : textProblems.length > 0
  const canGrade = files.length > 0 && answerKeyReady && !grading

  const akStatusLabel = !akSource ? "not set"
    : akSource === "quiz" ? "from AnyQuiz"
    : akSource === "scan" ? "scanned"
    : akSource === "photo" ? "photo taken"
    : akSource === "file"
      ? extractionState === "extracting" ? "reading…"
      : extractionState === "confirmed" ? `${confirmedItems?.length ?? 0} answers confirmed`
      : extractionState === "no-key" ? "no key found"
      : akFileName ? "file uploaded" : "not set"
    : problems.length > 0 ? `${problems.length} problems` : "not set"

  async function handleGrade() {
    if (!canGrade) return
    setGrading(true)
    setGradeError(null)
    setGradeResults(null)
    const endpoint = zipgradeMode && hasHandwritten
      ? "/api/grade-cross"
      : zipgradeMode
      ? "/api/grade-omr"
      : "/api/grade"
    try {
      // For batch PDFs: split into per-student slices first, then grade each slice
      const isBatchPdf = files.length === 1 && files[0].file.name.endsWith(".pdf") && files[0].file.size > 2_000_000
      if (isBatchPdf) {
        // ZipGrade: split by page (1 sheet = 1 page), no Claude needed
        // Handwritten: use split-batch (Claude detects student boundaries by handwriting)
        const splitEndpoint = zipgradeMode ? "/api/split-pages" : "/api/split-batch"
        const splitForm = new FormData()
        splitForm.append("file", files[0].file)
        const splitRes = await fetch(splitEndpoint, { method: "POST", body: splitForm })
        const splitText = await splitRes.text()
        if (!splitText) throw new Error(`split-pages returned empty response (status ${splitRes.status})`)
        let splitJson: { students: { name: string | null; pdfBase64: string }[]; error?: string }
        try { splitJson = JSON.parse(splitText) } catch { throw new Error(`split-pages bad JSON: ${splitText.slice(0, 200)}`) }
        if (!splitRes.ok) throw new Error(splitJson.error ?? "Batch split failed")
        const { students } = splitJson
        // Grade each student slice
        const allResults: ExtendedGradeFileResult[] = []
        for (let si = 0; si < students.length; si++) {
          const student = students[si]
          const sliceBlob = await fetch(`data:application/pdf;base64,${student.pdfBase64}`).then((r) => r.blob())
          const sliceFile = new File([sliceBlob], `${student.name ?? `page-${si + 1}`}.pdf`, { type: "application/pdf" })
          const gradeForm = new FormData()
          gradeForm.append("problems", JSON.stringify(problems))
          gradeForm.append("files", sliceFile)
          const gradeRes = await fetch(endpoint, { method: "POST", body: gradeForm })
          const gradeText = await gradeRes.text()
          if (!gradeText) { allResults.push({ filename: sliceFile.name, results: [], rawScore: 0, maxScore: problems.length, error: "empty response" }); continue }
          try {
            const gradeJson = JSON.parse(gradeText)
            if (gradeRes.ok && gradeJson.fileResults) {
              allResults.push(...gradeJson.fileResults.map((r: ExtendedGradeFileResult) => ({
                ...r, filename: student.name ?? r.filename,
              })))
            }
          } catch { allResults.push({ filename: sliceFile.name, results: [], rawScore: 0, maxScore: problems.length, error: `bad JSON: ${gradeText.slice(0, 100)}` }) }
        }
        setGradeResults(allResults)
      } else {
        const form = new FormData()
        form.append("problems", JSON.stringify(problems))
        files.forEach((f) => form.append("files", f.file))
        // Extract identity in parallel with grading
        const identityForms = files.map((f) => { const fd = new FormData(); fd.append("files", f.file); return { name: f.file.name, fd } })
        const [res, ...identityResps] = await Promise.all([
          fetch(endpoint, { method: "POST", body: form }),
          ...identityForms.map(({ fd }) => fetch("/api/extract-identity", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}))),
        ])
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Grade request failed")
        const nameMap = new Map(identityForms.map(({ name }, i) => [name, (identityResps[i] as { results?: { filename: string; name: string | null }[] })?.results?.[0]?.name ?? null]))
        const fileMap = new Map(files.flatMap((f) => {
          const url = URL.createObjectURL(f.file)
          return [[f.file.name, url], [f.name, url]] as [string, string][]
        }))
        const withUrls = (json.fileResults as ExtendedGradeFileResult[]).map((r) => ({
          ...r,
          studentName: nameMap.get(r.filename) ?? null,
          pdfUrl:      fileMap.get(r.filename),
        }))
        setGradeResults(withUrls)
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
        <div style={{ padding: "14px 32px", borderBottom: "1px solid #1c1c1c", background: "#111", flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>Assessment title</div>
            <input
              type="text"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. Quiz 3 – Kinematics"
              style={{ border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 10px", fontSize: 12, background: "#1a1a1a", color: "#fff", outline: "none", width: 240, fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>Type</div>
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
            <div style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>Max score</div>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="50"
              style={{ border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 10px", fontSize: 12, background: "#1a1a1a", color: "#fff", outline: "none", width: 80, fontFamily: "inherit" }}
            />
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 32px 0" }}>

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

          {akSource === "file" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input ref={akFileRef} type="file" accept=".jpg,.jpeg,.png,.heic,.pdf,.txt,.doc,.docx" style={{ display: "none" }} onChange={handleAKFile} />

              {/* Drop zone — shown when idle/no file yet */}
              {!akFileName && extractionState === "idle" && (
                <div
                  onClick={() => akFileRef.current?.click()}
                  style={{ border: "1.5px dashed #2a2a2a", borderRadius: 10, padding: "20px 24px", textAlign: "center", cursor: "pointer" }}
                >
                  <div style={{ fontSize: 13, color: "#ccc" }}>
                    Drop answer key here, or{" "}
                    <button onClick={(e) => { e.stopPropagation(); akFileRef.current?.click() }} style={{ background: "none", border: "none", color: "#4DB832", cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline" }}>browse</button>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>JPG · PNG · HEIC · PDF · TXT</div>
                </div>
              )}

              {/* File name + re-upload button */}
              {akFileName && extractionState !== "idle" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1a1a1a", borderRadius: 7 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{akFileName}</span>
                  <button onClick={() => akFileRef.current?.click()} style={{ background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>replace</button>
                </div>
              )}

              {/* Extracting spinner */}
              {extractionState === "extracting" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1a1a1a", borderRadius: 8, fontSize: 12, color: "#888" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", animation: "ag-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
                  Reading answer key…
                </div>
              )}

              {/* Extraction error */}
              {extractionError && (
                <div style={{ padding: "8px 12px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 7, fontSize: 12, color: "#ef4444" }}>
                  {extractionError}
                </div>
              )}

              {/* Confirmed summary */}
              {extractionState === "confirmed" && confirmedItems && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(77,184,50,.06)", border: "1px solid rgba(77,184,50,.2)", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: "#4DB832", fontWeight: 600 }}>✓ {confirmedItems.length} answers confirmed</span>
                  <button onClick={() => setExtractionState("review")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer" }}>review</button>
                  <button onClick={handleDiscardExtracted} style={{ background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer" }}>discard</button>
                </div>
              )}
            </div>
          )}

          {akSource === "scan" && (
            <div style={{ padding: "14px 16px", background: "#1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: scanner.status === "ready" ? "#4DB832" : scanner.status === "error" ? "#ef4444" : "#D97706",
                animation: scanner.status !== "ready" ? "ag-pulse 1.4s ease-in-out infinite" : "none",
              }} />
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>{scanner.name ?? "Waiting for scanner…"}</div>
                {scanner.name ? (
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{[scanner.connectionType, scanner.statusLabel, scanner.capability].filter(Boolean).join(" · ")}</div>
                ) : (
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Connect a scanner and place the answer key face-down.</div>
                )}
              </div>
            </div>
          )}

          {akSource === "photo" && (
            <div style={{ padding: "14px 16px", background: "#1a1a1a", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Open AnyGrade on your phone", "Tap Scan answer key and point at the key sheet"].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#ccc" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#2a2a2a", color: "#888", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ width: 64, height: 64, background: "#2a2a2a", borderRadius: 6 }} />
                <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>Session: {sessionCode}</span>
              </div>
            </div>
          )}
        </div>

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
                  <svg style={{ width: 32, height: 32, color: "#555", margin: "0 auto 10px", display: "block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 15V4M12 4L8 8M12 4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 13, color: "#ccc" }}>
                    Drop student answer sheets here, or{" "}
                    <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} style={{ background: "none", border: "none", color: "#4DB832", cursor: "pointer", fontSize: 13, padding: 0, textDecoration: "underline" }}>
                      browse
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Individual sheets or full batches — JPG · PNG · HEIC · PDF</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {files.map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderRadius: 8, background: "#1a1a1a" }}>
                      <span style={{ flex: 1, fontSize: 13, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                      {zipgradeDetected === "auto" && (
                        <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "2px 8px", flexShrink: 0, background: "rgba(77,184,50,.1)", border: "1px solid rgba(77,184,50,.2)", color: "#4DB832" }}>ZipGrade detected</span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "2px 8px", flexShrink: 0, background: "rgba(77,184,50,.18)", color: "#4DB832" }}>Ready</span>
                      <button onClick={() => removeFile(f.id)} style={{ background: "none", border: "none", color: "#555", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "1px dashed #2a2a2a", borderRadius: 8, color: "#666", fontSize: 12, padding: "8px 14px", cursor: "pointer", textAlign: "left", marginTop: 4 }}>
                    + Add more sheets
                  </button>
                </div>
              )}

            </div>
          )}

          {sheetSource === "scanner" && (
            <div style={{ padding: "14px 16px", background: "#1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", flexShrink: 0, animation: "ag-pulse 1.4s ease-in-out infinite" }} />
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>EPSON ES-400</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>USB · Ready · ADF 50-sheet capacity</div>
              </div>
            </div>
          )}

          {sheetSource === "phone" && (
            <div style={{ padding: "14px 16px", background: "#1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📱</div>
              <div>
                <div style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>Juan&apos;s iPhone 15</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>WiFi Direct · Session: <span style={{ fontFamily: "monospace" }}>{sessionCode}</span></div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", flexShrink: 0, marginLeft: "auto" }} />
            </div>
          )}
        </div>

        {/* ── Grading results ── */}
        {(gradeResults || gradeError || grading) && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Grading Results</SectionLabel>
            {grading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#888" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", animation: "ag-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
                Grading {files.length} {files.length === 1 ? "sheet" : "sheets"}…
              </div>
            )}
            {gradeError && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 12, color: "#ef4444" }}>
                {gradeError}
              </div>
            )}
            {gradeResults && <ResultsTable results={gradeResults} />}
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 32px", borderTop: "1px solid #1c1c1c", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#555" }}>
          {files.length > 0 ? `${files.length} ${files.length === 1 ? "sheet" : "sheets"}` : "no sheets"} · answer key: {akStatusLabel}
        </span>
        {gradeResults && (
          <button
            onClick={() => { setGradeResults(null); setFiles([]); setAkText(""); setAkFileName(null) }}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2a2a2a", background: "none", color: "#888", fontSize: 12, cursor: "pointer" }}
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

      {/* Modals — rendered at panel root so they overlay everything */}
      {extractionState === "no-key" && (
        <NoKeyModal
          onAutofill={async () => {
            setExtractionState("extracting")
            try {
              const fd = new FormData()
              // Re-send the file for predictive fill
              if (akFileRef.current?.files?.[0]) fd.append("file", akFileRef.current.files[0])
              const res = await fetch("/api/predict-key", { method: "POST", body: fd })
              const data = await res.json()
              setExtractedItems(data.items ?? [])
              setExtractionWarnings(data.warnings ?? [])
              setExtractionState("review")
            } catch {
              setExtractionState("no-key")
            }
          }}
          onCancel={handleDiscardExtracted}
        />
      )}

      {extractionState === "review" && (
        <KeyTableModal
          items={extractedItems}
          warnings={extractionWarnings}
          onConfirm={handleConfirmExtracted}
          onClose={handleDiscardExtracted}
        />
      )}
    </div>
  )
}
