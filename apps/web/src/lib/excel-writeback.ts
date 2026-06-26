/**
 * Excel write-back using File System Access API + SheetJS.
 *
 * Flow:
 *  1. Teacher clicks "Write to my Excel"
 *  2. Browser opens local file picker (showOpenFilePicker)
 *  3. We read the .xlsx, parse sheet names + column headings
 *  4. Teacher picks: sheet, name column, score column
 *  5. We fuzzy-match student names from AnyGrade → Excel rows
 *  6. Write scores into the matched cells
 *  7. Save back to the same file (no download)
 *
 * Requires Chrome or Edge. Shows a browser notice on Firefox/Safari.
 */

import * as XLSX from "xlsx";

export type ExcelColumn = { key: string; label: string };
export type ExcelSheet = { name: string; columns: ExcelColumn[] };

export type StudentScore = {
  name: string;
  studentId: string;
  score: number;
  maxScore: number;
};

export type MatchResult = {
  excelRow: number; // 0-based row index in sheet data
  excelName: string;
  anyGradeStudent: StudentScore;
  similarity: number; // 0–1
};

export type UnmatchedStudent = {
  anyGradeStudent: StudentScore;
  suggestions: Array<{ excelRow: number; excelName: string; similarity: number }>;
};

export type WritebackPlan = {
  matched: MatchResult[];
  unmatched: UnmatchedStudent[];
  sheetName: string;
  scoreColumnKey: string;
};

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

/** Open the teacher's Excel file and return parsed sheet metadata. */
export async function openExcelFile(): Promise<{
  fileHandle: FileSystemFileHandle;
  sheets: ExcelSheet[];
  workbook: XLSX.WorkBook;
}> {
  const [fileHandle] = await (window as Window & { showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
    types: [
      {
        description: "Excel Files",
        accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
      },
    ],
    multiple: false,
  });

  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets: ExcelSheet[] = workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const headers = data[0] ?? [];
    const columns: ExcelColumn[] = headers
      .map((h, i) => ({ key: XLSX.utils.encode_col(i), label: String(h ?? `Column ${i + 1}`) }))
      .filter((c) => c.label.trim() !== "");
    return { name, columns };
  });

  return { fileHandle, sheets, workbook };
}

/**
 * Fuzzy-match AnyGrade student names → Excel rows.
 * Uses Levenshtein similarity (no external dep — keep it in-browser).
 */
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = temp;
    }
  }
  return dp[b.length];
}

export function buildWritebackPlan(
  students: StudentScore[],
  workbook: XLSX.WorkBook,
  sheetName: string,
  nameColumnKey: string,
  scoreColumnKey: string,
  matchThreshold = 0.82,
): WritebackPlan {
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  // Rows 1+ are data (row 0 is headers)
  const dataRows = rows.slice(1).map((row, idx) => ({
    excelRow: idx + 1,
    excelName: String(row[XLSX.utils.decode_col(nameColumnKey)] ?? "").trim(),
  }));

  const matched: MatchResult[] = [];
  const unmatched: UnmatchedStudent[] = [];

  for (const student of students) {
    const scores = dataRows.map((row) => ({
      ...row,
      similarity: similarity(student.name, row.excelName),
    }));
    scores.sort((a, b) => b.similarity - a.similarity);

    const best = scores[0];
    if (best && best.similarity >= matchThreshold) {
      matched.push({
        excelRow: best.excelRow,
        excelName: best.excelName,
        anyGradeStudent: student,
        similarity: best.similarity,
      });
    } else {
      unmatched.push({
        anyGradeStudent: student,
        suggestions: scores.slice(0, 3),
      });
    }
  }

  return { matched, unmatched, sheetName, scoreColumnKey };
}

/** Write scores into the workbook and save back to the original file. */
export async function writeScoresToFile(
  fileHandle: FileSystemFileHandle,
  workbook: XLSX.WorkBook,
  plan: WritebackPlan,
  manualMatches: Array<{ anyGradeStudent: StudentScore; excelRow: number }> = [],
): Promise<void> {
  const ws = workbook.Sheets[plan.sheetName];

  const allMatches = [
    ...plan.matched,
    ...manualMatches.map((m) => ({
      excelRow: m.excelRow,
      excelName: "",
      anyGradeStudent: m.anyGradeStudent,
      similarity: 1,
    })),
  ];

  for (const match of allMatches) {
    // +1 because row 0 = headers, XLSX rows are 1-based in sheet, data rows start at row index 1 → sheet row 2
    const cellAddr = `${plan.scoreColumnKey}${match.excelRow + 1}`;
    ws[cellAddr] = { t: "n", v: match.anyGradeStudent.score };
  }

  const writable = await fileHandle.createWritable();
  const wbOut = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  await writable.write(new Blob([wbOut]));
  await writable.close();
}
