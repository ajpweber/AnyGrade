# AnyGrade — Architecture

_Last updated: 2026-06-26_

This document describes how the system currently works. It is edited in place as the system evolves. No history, no rationale — those belong in CHANGELOG.md and docs/decisions/.

---

## System overview

AnyGrade is a teacher-facing tool for grading student answer sheets. A teacher uploads scans or photos of student papers, optionally uploads or scans an answer key, and gets back scored results with per-item breakdowns. The grading is done by Claude Vision (Anthropic API) — no traditional OCR library.

---

## Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS v4 + shadcn/ui (Base UI) | Vercel |
| Backend API | FastAPI (Python 3.11) | **Local only** — never deployed to production. All production responsibilities (email, DB writes) were built directly into Next.js API routes instead. |
| Vision + grading | Anthropic API (`claude-sonnet-4-6`) | Called from Next.js API routes |
| Database + auth | Supabase (Postgres + Auth + Storage) | Supabase cloud |
| Local dev | Docker Compose (`web` + `api` services) | localhost |
| Email | Resend | Called from FastAPI |

---

## Application structure

```
AnyGrade/
├── apps/
│   ├── web/          — Next.js frontend + API routes
│   └── api/          — FastAPI backend (auth, email, DB writes)
├── docker-compose.yml
└── docs/
    ├── decisions/    — Architecture Decision Records
    └── spec-workspace-v1.md
```

---

## Frontend routes (`apps/web`)

| Route | What it is |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/login` | Supabase auth login page |
| `/dashboard` | Teacher dashboard (older route, still live) |
| `/dashboard/classes/new` | Create a new class |
| `/dashboard/classes/[id]` | View a single class |
| `/dashboard/upload` | Upload answer sheets (older flow) |
| `/workspace` | Main working surface — AnyQuiz, AnyGrade, AnySubject panels |
| `/correct/[token]` | Teacher correction flow via token URL |
| `/join/[joinCode]` | Student joins a class by code |

Auth guard on `/workspace`: `supabase.auth.getUser()` → redirects to `/login` if no session.

**Login flow:** Login uses Supabase magic link (passwordless). After the teacher enters their email, Supabase sends a sign-in link. Clicking it hits `/auth/callback`, which exchanges the code for a session and redirects to `/workspace`. Navigating directly to `/` redirects to `/dashboard` (the older teacher dashboard, still live). These are two separate entry points — not a conflict.

---

## Next.js API routes (`apps/web/src/app/api/`)

All grading routes call the Anthropic API directly. They accept `multipart/form-data` and return JSON.

| Route | What it does |
|---|---|
| `POST /api/grade` | Grades handwritten solution sheets. Takes files + a `problems` JSON array (label, expected answer, points). Returns per-file scored results with bounding boxes where answers were found. |
| `POST /api/grade-omr` | Grades bubble (OMR) sheets only. Takes a pre-read answer record and scores it against a key. |
| `POST /api/grade-cross` | Reads both bubble and handwritten answers from one sheet in a single pass, then scores against a key. |
| `POST /api/omr` | Reads a ZipGrade bubble sheet (50 questions, A–E). Returns filled letters per question, key version, and student ID from the bubble grid. |
| `POST /api/extract-key` | Reads a scanned answer key sheet and extracts the correct answers per item. |
| `POST /api/predict-key` | Suggests corrections or fills gaps in a partially extracted key. |
| `POST /api/extract-identity` | Reads a student's name and/or ID number directly from their scanned sheet. |
| `POST /api/detect-sheet` | Checks whether an uploaded file looks like an answer sheet before grading. |
| `POST /api/detect-batch` | Detects whether an upload is a batch (multiple students in one file). |
| `POST /api/split-pages` | Splits a multi-page PDF into individual pages (one per student). |
| `POST /api/split-batch` | Splits a large batch PDF and returns each page as a separate file for grading. |
| `POST /api/send-corrections` | Sends correction tokens to the teacher for flagged answers. |

Heavy routes (`omr`, `grade`, `grade-omr`, `grade-cross`, `split-batch`) have `maxDuration = 300` set for Vercel.

---

## FastAPI backend (`apps/api/`)

Handles database writes, email delivery, and the original grading logic (still present but the active grading pipeline uses the Next.js routes above).

| Router | Prefix | What it does |
|---|---|---|
| `exams.py` | `/exams` | Create and read exam records |
| `papers.py` | `/exams` | Upload and queue student paper jobs |
| `answers.py` | `/student-answers` | Read and correct individual answers |
| `tokens.py` | `/access-tokens` | Claim tokens, trigger email delivery via Resend |

Services:
- `services/grading.py` — pure Python grading functions (MCQ exact match, numeric with tolerance, unit normalization, comma-as-decimal for Philippine locale). This is the utility library; the active grading pipeline uses the Claude Vision routes in Next.js above. Keep — it is tested, referenced, and useful as a fallback or for offline grading logic.
- `services/ocr.py` — original OCR service stub (PaddleOCR was planned but not built; superseded by Claude Vision).
- `scripts/ocr_experiment.py` — batch accuracy testing script

---

## Workspace UI (`/workspace`)

The main teacher interface. Three panels in a sidebar layout:

- **AnyQuiz** — Quiz builder. Teacher picks class → topic → question types → generates a `.docx` file. No database write; download only.
- **AnyGrade** — Answer sheet grader. Teacher uploads student sheets and provides an answer key (by upload, scan, photo, or from AnyQuiz). Triggers the grading pipeline.
- **AnySubject** — Class insights and email feedback. Shows per-tier results (upper ≥75%, middle 50–74%, at-risk <50%) and lets the teacher send personalized feedback emails to students.

State lives in `WorkspaceShell.tsx` (client component). The page server component does the auth check and fetches classes + syllabi.

---

## Database (Supabase)

Schema is version-controlled in `supabase/migrations/`. The initial migration (`20260621000000_initial_schema.sql`) was written retroactively on 2026-06-26 to match the schema as applied manually via the Supabase dashboard at project start. **Verify this file against the live dashboard before running it in a fresh environment** — the dashboard may have drifted.

Core tables:

| Table | Purpose |
|---|---|
| `teachers` | Teacher accounts, separate from Supabase auth users |
| `ched_curricula` | Philippine CHED curriculum reference data |
| `ched_subjects` | Subjects per CHED curriculum with outcomes |
| `cmo_topic_chunks` | Topic chunks with vector embeddings — used by AnyQuiz for topic lookup and quiz generation |
| `school_syllabi` | Institution-level syllabi linked to CHED subjects; holds topics and learning outcomes |
| `classes` | Teacher's class sections; linked to a syllabus; has a student join code |
| `students` | Students enrolled in a class (not linked to exams — linked to classes) |
| `assessments` | A grading event within a class (quiz, exam, etc.); has a type enum |
| `submissions` | Per-student result for an assessment; holds scan URL, OCR result, and score |
| `correction_tasks` | Token-based teacher correction jobs — teacher opens `/correct/[token]` to review and fix grading errors |

Student file storage: `scans/{user_id}/{assessment_id}/{n}.ext`
Answer key storage: `scans/{user_id}/{assessment_id}/answer-key.ext`

---

## Local development

```
docker compose up   # starts web (port 3000) and api (port 8000)
```

Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

Active dev edits go in `C:\dev\AnyGrade` (symlinked or mirrored from `U:\gDrive\Ventures\AnyGrade`).

---

## Design system

See [DESIGN.md](DESIGN.md) for the full UI design system (tokens, spacing, typography, component rules). Dark theme by default; accent color `#4DB832`.
