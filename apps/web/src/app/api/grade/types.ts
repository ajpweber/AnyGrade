export type BBox = { page: number; x: number; y: number; w: number; h: number }

export type GradeResult = {
  label: string
  read: string
  correct: boolean | null
  confidence: "high" | "medium" | "low" | "?"
  pts: number
  bboxes?: BBox[]   // one entry per distinct boxed region on the paper
  /** @deprecated use bboxes */
  bbox?: BBox
}

export type GradeFileResult = {
  filename: string
  studentName?: string | null
  results: GradeResult[]
  rawScore: number
  maxScore: number
  error?: string
}
