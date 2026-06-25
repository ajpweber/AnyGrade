export type BBox = { page: number; x: number; y: number; w: number; h: number }

export type GradeResult = {
  label: string
  read: string
  correct: boolean | null
  confidence: "high" | "medium" | "low" | "?"
  pts: number
  bbox?: BBox
}

export type GradeFileResult = {
  filename: string
  results: GradeResult[]
  rawScore: number
  maxScore: number
  error?: string
}
