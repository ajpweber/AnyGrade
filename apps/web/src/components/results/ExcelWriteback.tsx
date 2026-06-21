"use client";

/**
 * ExcelWriteback — lets teachers write AnyGrade scores directly into their
 * local Excel gradebook via the File System Access API (Chrome/Edge only).
 *
 * States: idle → file-open → mapping → preview → writing → done | error
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  isFileSystemAccessSupported,
  openExcelFile,
  buildWritebackPlan,
  writeScoresToFile,
  type ExcelSheet,
  type StudentScore,
  type WritebackPlan,
  type UnmatchedStudent,
} from "@/lib/excel-writeback";
import type * as XLSX from "xlsx";

type Props = {
  students: StudentScore[];
};

type State =
  | { step: "idle" }
  | { step: "opening" }
  | { step: "mapping"; sheets: ExcelSheet[]; fileHandle: FileSystemFileHandle; workbook: XLSX.WorkBook }
  | { step: "preview"; plan: WritebackPlan; fileHandle: FileSystemFileHandle; workbook: XLSX.WorkBook; manualMatches: ManualMatch[] }
  | { step: "writing" }
  | { step: "done"; written: number }
  | { step: "error"; message: string };

type ManualMatch = { anyGradeName: string; excelRow: number };

export function ExcelWriteback({ students }: Props) {
  const [state, setState] = useState<State>({ step: "idle" });
  const [sheetName, setSheetName] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [scoreCol, setScoreCol] = useState("");

  if (!isFileSystemAccessSupported()) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        "Write to Excel" requires Chrome or Edge. Your browser doesn't support it.{" "}
        <button className="underline" onClick={() => {}}>
          Download CSV instead
        </button>
      </div>
    );
  }

  async function handleOpen() {
    setState({ step: "opening" });
    try {
      const { fileHandle, sheets, workbook } = await openExcelFile();
      setSheetName(sheets[0]?.name ?? "");
      setState({ step: "mapping", sheets, fileHandle, workbook });
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") {
        setState({ step: "idle" });
      } else {
        setState({ step: "error", message: String(e) });
      }
    }
  }

  function handleBuildPlan() {
    if (state.step !== "mapping" || !sheetName || !nameCol || !scoreCol) return;
    const plan = buildWritebackPlan(students, state.workbook, sheetName, nameCol, scoreCol);
    setState({ step: "preview", plan, fileHandle: state.fileHandle, workbook: state.workbook, manualMatches: [] });
  }

  async function handleWrite() {
    if (state.step !== "preview") return;
    setState({ step: "writing" });
    try {
      await writeScoresToFile(state.fileHandle, state.workbook, state.plan, []);
      setState({ step: "done", written: state.plan.matched.length });
    } catch (e) {
      setState({ step: "error", message: String(e) });
    }
  }

  if (state.step === "idle" || state.step === "opening") {
    return (
      <Button onClick={handleOpen} disabled={state.step === "opening"} variant="outline">
        {state.step === "opening" ? "Opening file…" : "Write to my Excel"}
      </Button>
    );
  }

  if (state.step === "mapping") {
    const { sheets } = state;
    const selectedSheet = sheets.find((s) => s.name === sheetName);
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-sm font-medium">Map your Excel gradebook columns</p>

        <div className="grid gap-3">
          <label className="text-sm">
            Sheet
            <Select value={sheetName} onValueChange={setSheetName}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {selectedSheet && (
            <>
              <label className="text-sm">
                Student name column
                <Select value={nameCol} onValueChange={setNameCol}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Which column has names?" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSheet.columns.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="text-sm">
                Score column to write into
                <Select value={scoreCol} onValueChange={setScoreCol}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="e.g. Exam 1, Quiz 3…" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSheet.columns
                      .filter((c) => c.key !== nameCol)
                      .map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleBuildPlan} disabled={!sheetName || !nameCol || !scoreCol}>
            Preview matches
          </Button>
          <Button variant="ghost" onClick={() => setState({ step: "idle" })}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (state.step === "preview") {
    const { plan } = state;
    const total = plan.matched.length + plan.unmatched.length;
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-sm font-medium">
          Will write{" "}
          <span className="text-green-700 font-semibold">{plan.matched.length}/{total}</span>{" "}
          scores to "{plan.sheetName}"
        </p>

        {plan.unmatched.length > 0 && (
          <UnmatchedList unmatched={plan.unmatched} />
        )}

        <div className="max-h-48 overflow-y-auto rounded border text-xs">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">AnyGrade name</th>
                <th className="px-3 py-2 text-left">Excel row name</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Match</th>
              </tr>
            </thead>
            <tbody>
              {plan.matched.map((m, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-1">{m.anyGradeStudent.name}</td>
                  <td className="px-3 py-1">{m.excelName}</td>
                  <td className="px-3 py-1 text-right">{m.anyGradeStudent.score}/{m.anyGradeStudent.maxScore}</td>
                  <td className="px-3 py-1 text-right">
                    <Badge variant={m.similarity === 1 ? "default" : "secondary"}>
                      {Math.round(m.similarity * 100)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleWrite}>Write to Excel</Button>
          <Button variant="ghost" onClick={() => setState({ step: "idle" })}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (state.step === "writing") {
    return <p className="text-sm text-muted-foreground">Writing scores to your Excel file…</p>;
  }

  if (state.step === "done") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3">
        <span className="text-green-700 text-sm font-medium">
          Done — {state.written} scores written to your Excel file.
        </span>
        <Button size="sm" variant="ghost" onClick={() => setState({ step: "idle" })}>Write again</Button>
      </div>
    );
  }

  if (state.step === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {state.message}
        <Button size="sm" variant="ghost" className="ml-2" onClick={() => setState({ step: "idle" })}>
          Retry
        </Button>
      </div>
    );
  }
}

function UnmatchedList({ unmatched }: { unmatched: UnmatchedStudent[] }) {
  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
      <p className="font-medium text-yellow-800 mb-2">
        {unmatched.length} student{unmatched.length > 1 ? "s" : ""} not matched — scores skipped:
      </p>
      <ul className="space-y-1 text-yellow-700 text-xs">
        {unmatched.map((u, i) => (
          <li key={i}>
            <span className="font-medium">{u.anyGradeStudent.name}</span>
            {u.suggestions[0] && (
              <span className="text-yellow-600"> — closest: "{u.suggestions[0].excelName}" ({Math.round(u.suggestions[0].similarity * 100)}%)</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-yellow-600 text-xs">Download CSV to add these manually.</p>
    </div>
  );
}
