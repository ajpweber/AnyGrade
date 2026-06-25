import type { Database } from "@/lib/database.types"

export type Mode = "quiz" | "grade" | "subject"

export type AssessmentType = Database["public"]["Enums"]["assessment_type"]

export type Syllabus = {
  subject_code: string
  subject_title: string
  topics: string[]
}

export type ClassItem = {
  id: string
  name: string
  joinCode: string | null
  syllabus: Syllabus | null
}

export type Assessment = {
  id: string
  title: string
  conducted_at: string | null
  max_score: number
  total_items: number
  type: AssessmentType | null
}

export type QuizTypeId = "mc" | "tf" | "id" | "es" | "ps"

export type QuizTypeRow = {
  on: boolean
  qty: number
  pts: number
}

export type QuizState = {
  topic: string
  assessmentType: AssessmentType
  randomize: boolean
  personalize: boolean
  types: Record<QuizTypeId, QuizTypeRow>
}

export type AKSource = "quiz" | "file" | "scan" | "photo"

export type UploadFileStatus = "pending" | "uploading" | "ready" | "error"

export type UploadFile = {
  id: string
  name: string
  size: number
  file: File
  status: UploadFileStatus
}

export type ScannerStatus = "waiting" | "ready" | "scanning" | "error"

export type ScannerState = {
  name: string | null
  connectionType: string | null
  statusLabel: string | null
  capability: string | null
  status: ScannerStatus
}

export type TierId = "upper" | "middle" | "atrisk"

export type Submission = {
  id: string
  raw_score: number
  students: {
    id: string
    full_name: string
    email: string | null
  } | null
}

export const Q_TYPES: {
  id: QuizTypeId
  label: string
  defaultQty: number
  defaultPts: number
  timeMin: number
}[] = [
  { id: "mc", label: "Multiple Choice", defaultQty: 10, defaultPts: 2,  timeMin: 1.5 },
  { id: "tf", label: "True or False",   defaultQty: 10, defaultPts: 1,  timeMin: 0.75 },
  { id: "id", label: "Identification",  defaultQty: 5,  defaultPts: 2,  timeMin: 2 },
  { id: "es", label: "Essay",           defaultQty: 2,  defaultPts: 10, timeMin: 8 },
  { id: "ps", label: "Problem Solving", defaultQty: 3,  defaultPts: 5,  timeMin: 8 },
]

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: "quiz",       label: "Quiz" },
  { value: "activity",   label: "Activity" },
  { value: "seatwork",   label: "Seatwork" },
  { value: "exam",       label: "Exam" },
  { value: "long_exam",  label: "Long Exam" },
  { value: "lab_report", label: "Lab Report" },
  { value: "recitation", label: "Recitation" },
  { value: "project",    label: "Project" },
]

export const TIERS: {
  id: TierId
  label: string
  range: string
  color: string
  bg: string
}[] = [
  { id: "upper",  label: "Upper",   range: "≥ 75%",  color: "#4DB832", bg: "rgba(77,184,50,.06)" },
  { id: "middle", label: "Middle",  range: "50–74%", color: "#f59e0b", bg: "rgba(245,158,11,.06)" },
  { id: "atrisk", label: "At-risk", range: "< 50%",  color: "#ef4444", bg: "rgba(239,68,68,.06)" },
]

export const DEFAULT_MESSAGES: Record<TierId, string> = {
  upper:  "Great work! You demonstrated strong understanding of the material. Keep it up!",
  middle: "You're on the right track. Review the topics we discussed and you'll do even better next time.",
  atrisk: "Don't be discouraged — let's work through this together. Please see me after class so we can go over the key concepts.",
}

export const INITIAL_QUIZ_STATE: QuizState = {
  topic: "",
  assessmentType: "quiz",
  randomize: false,
  personalize: false,
  types: {
    mc: { on: true,  qty: 10, pts: 2 },
    tf: { on: false, qty: 10, pts: 1 },
    id: { on: false, qty: 5,  pts: 2 },
    es: { on: false, qty: 2,  pts: 10 },
    ps: { on: false, qty: 3,  pts: 5 },
  },
}

export const INITIAL_SCANNER_STATE: ScannerState = {
  name: null,
  connectionType: null,
  statusLabel: null,
  capability: null,
  status: "waiting",
}

export function classifyScore(rawScore: number, maxScore: number): TierId {
  const pct = rawScore / maxScore
  if (pct >= 0.75) return "upper"
  if (pct >= 0.50) return "middle"
  return "atrisk"
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
