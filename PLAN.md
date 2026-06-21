# AnyGrade — Implementation Plan v1
_Generated: 2026-06-21 | /autoplan_

## Stack
- **Frontend:** Next.js 15 (App Router) + Tailwind + shadcn/ui — deploy on Vercel
- **Backend:** FastAPI (Python 3.11) + PaddleOCR / PP-StructureV2 — deploy on Railway.app
- **DB + Storage:** Supabase (Postgres + Storage)
- **Email:** Resend (simple transactional email, generous free tier)

---

## Milestone 0 — Repo + Infra (Day 1–2)

- [ ] Init monorepo: `apps/web` (Next.js), `apps/api` (FastAPI), `packages/` (shared types)
- [ ] `docker-compose.yml` — `web` + `api` + local Supabase
- [ ] `Makefile` — `make dev`, `make test`, `make migrate`
- [ ] Supabase project — apply schema migrations (see data model below)
- [ ] Railway project — link to `apps/api`, auto-deploy on push to `main`
- [ ] Vercel project — link to `apps/web`
- [ ] `.env.local.example` with all required keys documented
- [ ] `fixtures/` directory — add 5 sample exam paper images for OCR testing

## Milestone 1 — OCR Pipeline (Day 3–7, critical path)

Goal: scan a real student paper, extract answer text per item, measure accuracy.

- [ ] Install PP-StructureV2 + PaddleOCR in FastAPI service
- [ ] `POST /process-paper` — accepts one image + blank questionnaire image
  - Step 1: blur check (Laplacian variance < 100 → reject with reason)
  - Step 2: perspective correction (OpenCV `findHomography` vs blank questionnaire)
  - Step 3: template match → extract answer regions per item number
  - Step 4: PaddleOCR on each cropped region → `{item, text, confidence}`
  - Step 5: return extraction results + annotated image (bounding boxes drawn)
- [ ] `scripts/ocr_experiment.py` — batch test script
  - Input: folder of cropped answer images
  - Output: CSV with `{filename, extracted, expected, correct, confidence}`
  - Prints: accuracy %, avg confidence, failure cases
- [ ] **Run experiment on real papers — target ≥85% accuracy on answer extraction**
- [ ] Tune confidence threshold for `needs_review` flag (start at 0.75)

## Milestone 2 — Grading Engine (Day 5–8)

- [ ] `grading.py` — pure functions, no DB
  - `grade_mcq(extracted: str, correct: str) → bool`
  - `grade_numeric(extracted: str, correct: str, tolerance: float) → bool`
  - `parse_numeric(text: str) → float | None` — handles "42.7 kJ", "42.7", "≈43"
  - Returns `{is_correct, needs_review, reason}` per item
- [ ] Unit tests for grading engine — 30+ cases including edge cases:
  - Trailing units ("kJ", "°C", "m/s")
  - Comma vs period decimals ("42,7" → 42.7)
  - Scientific notation ("4.27e1")
  - OCR misreads ("O" vs "0", "l" vs "1")
  - Empty / unreadable answer

## Milestone 3 — Exam Processing API (Day 6–10)

- [ ] Supabase schema — apply all migrations:
  ```sql
  exams, students, student_answers, access_tokens
  ```
  (see data model in design doc)
- [ ] `POST /exams` — create exam, store answer key as JSONB
- [ ] `POST /exams/{id}/papers` — upload batch of student paper images
  - Accepts multipart/form-data with multiple files
  - Queues each paper as a processing job
  - Returns `{job_id, total_papers}`
- [ ] Background worker — processes paper queue
  - On completion: updates `students`, `student_answers`, stores annotated image in Supabase Storage
  - Failed papers: set `ocr_status = 'failed'`, store failure reason
- [ ] `GET /exams/{id}/status` — `{completed, total, failed_papers[]}`
- [ ] `PATCH /student-answers/{id}/correct` — teacher override
  - Updates `corrected_answer`, re-runs `grade_*`, updates student score

## Milestone 4 — Teacher Dashboard (Day 8–14)

Pages (all in `apps/web/app/`):

### `/` — Landing / Upload
- Hero: "Check any paper in minutes"
- Upload zone: blank questionnaire + answer key entry (item-by-item form)
- "Start Checking" → creates exam, goes to `/exam/[id]/upload`
- Mobile-responsive (teachers scan on phone)

### `/exam/[id]/upload` — Paper Upload
- Drag-and-drop or camera capture (multiple files)
- Class list CSV upload (name, student_id, email columns)
- Progress bar while processing
- Shows failed papers with re-upload option

### `/exam/[id]/results` — Results Dashboard (desktop-optimized)
- Summary bar: class average, total students, items count
- Alphabetical student list — each row: name, score/max, status badge
- Expandable row: annotated paper image + per-item breakdown
  - Flagged extractions (`needs_review=true`) shown in yellow — click to correct
  - Correction input appears inline — saves on blur
- "Export scores" button — two options:
  - **Download CSV** — fallback for any browser
  - **Write to my Excel** — File System Access API + SheetJS
    - Teacher opens their local .xlsx file via browser file picker
    - AnyGrade reads all sheet names → teacher picks sheet (e.g. "Math")
    - AnyGrade reads column headings → teacher picks: name column (to match students) + score column (to write into, e.g. "Exam 1")
    - AnyGrade fuzzy-matches student names from Excel to scanned papers
    - Writes scores directly into the Excel file in-place — no download, no re-upload
    - Shows preview: "Will write 58/60 scores. 2 names not matched — review below"
    - Unmatched names shown with suggestions — teacher picks correct row manually
    - One click: "Write to Excel" → file saved locally
- "Generate Student Links" button (disabled until class list uploaded)

### `/exam/[id]/item-analysis` — Item Analysis
- Table: item number, correct answer, % correct, % wrong, most common wrong answer
- Bar chart (simple, CSS-only) showing difficulty per item
- "Items to re-teach" highlight — items where < 50% correct

### `/access/[token]` — Student Access (mobile-first)
- Form: email field + student ID field
- Submit → API validates, sends email with signed link
- Success screen: "Check your email — link expires in 10 minutes"
- Error: wrong credentials → generic "Details not found" (don't reveal which field failed)

## Milestone 5 — Student Email Delivery (Day 12–15)

- [ ] Resend account + domain setup (or use Resend's shared domain for v1)
- [ ] `POST /access-tokens/claim` — validates email + student_id against class list
  - If match: generate signed Supabase Storage URL (10-min expiry)
  - Send email via Resend with link + student name + score
  - Mark token `email_sent_at`
  - Return `{sent: true}` — never return the URL directly to the browser
- [ ] Email template — shows: student name, subject, score, "View your paper" button
- [ ] `access_tokens` row: mark `used_at` after email sent (one send per token)

## Milestone 6 — End-to-End Test (Day 15–18)

- [ ] Use own papers from this semester — full batch of 30+ students
- [ ] Measure: OCR accuracy, processing time per paper, grading accuracy
- [ ] Fix top 3 failure modes found
- [ ] Get Ms. Macariola or Sir Rebutada to run one real quiz batch
- [ ] Document what broke and fix before August

---

## Data Model (Supabase SQL)

```sql
CREATE TABLE exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_token text NOT NULL,  -- UUID from browser cookie, no auth in v1
  subject text NOT NULL,
  exam_name text NOT NULL,
  blank_questionnaire_path text,
  answer_key jsonb NOT NULL,  -- [{item, answer, tolerance, type: 'mcq'|'numeric'}]
  created_at timestamptz DEFAULT now()
);

CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  student_id text NOT NULL,
  email text,
  paper_image_path text,
  annotated_image_path text,
  raw_score numeric DEFAULT 0,
  max_score numeric,
  ocr_status text DEFAULT 'pending',  -- pending|processing|done|failed|needs_review
  ocr_failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE student_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  item_number int NOT NULL,
  extracted_answer text,
  correct_answer text,
  is_correct boolean,
  confidence numeric,
  needs_review boolean DEFAULT false,
  corrected_answer text,  -- teacher override
  corrected_at timestamptz,
  UNIQUE(student_id, item_number)
);

CREATE TABLE access_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  token text UNIQUE DEFAULT gen_random_uuid()::text,
  email_sent_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  UNIQUE(exam_id, student_id)
);
```

---

## Deferred (v2)
- Safari/Firefox support for Excel write-back (File System Access API is Chrome/Edge only — show a browser notice)
- Teacher login / magic link auth
- Essay grading (LLM + rubric)
- Full solution step grading (partial credit)
- Exam history / past exam dashboard
- School/admin multi-teacher accounts
- DepEd integration
- Native mobile app

---

## Pricing (decide before August)
- Free: 1 exam, up to 40 papers — enough for Ms. Macariola's first test
- Paid: ₱299/month — unlimited exams, unlimited papers, student email delivery
- Decide based on what first users say after the beta

---

## Risk: OCR accuracy gate
If the Milestone 1 experiment shows < 85% accuracy on answer extraction:
- Option A: require teachers to circle/box their answer on the questionnaire template
- Option B: use a vision LLM (Claude claude-sonnet-4-6 vision) as fallback for low-confidence extractions
- Option C: require a printed answer sheet with defined boxes (structured layout, not freeform)

Do not proceed to Milestone 4 without clearing this gate.
