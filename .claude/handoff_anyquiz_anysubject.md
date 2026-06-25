# Handoff: AnyQuiz + AnySubject — /office-hours continuation

## What this file is for
A new Claude Code session should read this file to continue the adversarial `/office-hours` 
QA test for AnyQuiz and AnySubject. The session was interrupted mid-flow and never produced 
the final design doc.

---

## The Product Suite

### AnyGrade (existing wedge)
Scan-and-grade tool for Philippine teachers. Teachers photograph/scan handwritten student 
answer sheets → AI reads and grades them → results delivered via email. This is the entry 
product that is already being built.

### AnyQuiz (new idea — assessment creator)
A tool for teachers to **create** assessments, not grade them.

Key features the user described:
- **OCR import** — teacher photographs an existing printed quiz, AnyQuiz digitizes it
- **AI question generation** — teacher types a topic (or uploads syllabus/CHED curriculum), 
  system generates aligned questions
- **CHED/syllabus corpus** — the data moat: questions tagged to specific Philippine curriculum 
  topics (CHED = Commission on Higher Education)
- **N-permutation anti-cheating** — generates N versions of the same quiz with shuffled 
  question order and answer choices, so seat neighbors have different variants
- **Time estimation** — estimates how long the quiz will take based on question count/type
- **Difficulty scoring** — rates question difficulty

Primary user: **college teachers in the Philippines**

### AnySubject (new idea — student scheduler)
A student-facing personalized learning tool.

Key features:
- **Post-grade email hook** — after AnyGrade delivers results to teacher, a copy goes to 
  student with weak-topic identification
- **Personalized problem exposure** — surfaces varied problem types for topics the student 
  scored low on
- **Simulated quizzes** — practice quizzes generated from the corpus
- **Randomized notifications** — nudges student to practice at varied times

Primary user: **students whose teachers use AnyGrade/AnyQuiz**

---

## Strategy Context (agreed during office-hours)

The flywheel: AnyGrade (wedge) → teacher adopts → AnyQuiz (quiz creation) → 
AnySubject (student side). Each step uses data from the previous.

**Agreed premises** (user confirmed all 4 as "agree"):
1. AnyGrade-first strategy — build the teacher grading habit before adding creation tools
2. The data corpus (questions tagged to CHED syllabus topics) is the moat — hard to replicate
3. AnySubject is the riskiest — students are a different persona, different acquisition channel
4. The anti-cheating N-permutation feature is the viral hook for AnyQuiz — teachers share it

**User clarification on Premise re: "active users":**
"Launching AnySubject before AnyGrade has active users" — confirmed this means active 
**teacher** users of AnyGrade, not students.

---

## /office-hours Session State

The YC-style adversarial office hours were running. The flow covers:

### Completed sections:
- Q1–Q5: Problem, Solution, Market, Traction, Business model (covered in prior session)
- Q6 — Future-Fit: "Do these get stronger or weaker as the world changes?" 
  → User answered: **agree, agree, agree, agree** for all 4 sub-premises

### Where it stopped:
**The session was interrupted before the Premise Challenge phase concluded and before 
the final design doc was written.**

The adversarial questions that still need to be asked/answered:
- The "coverage alignment" insight: the real wedge for AnyQuiz is NOT speed of quiz creation 
  — it's **topic-coverage alignment** (generating questions that match exactly what was taught 
  in a specific class session, aligned to CHED syllabus). This is the insight that reframes 
  the product's core value prop.
- Narrowest viable wedge: "type a topic → get 5 questions aligned to syllabus" 
  (this should be the MVP, not the full N-permutation system)
- AnySubject entry strategy via the post-grade email hook needs adversarial pressure:
  does the student actually open/use it without teacher mandate?

### What still needs to happen:
1. **Resume adversarial /office-hours** — continue the premise challenge phase
2. **Produce the final design doc** for AnyQuiz + AnySubject covering:
   - Problem statement
   - Core features (MVP vs later)
   - Go-to-market (AnyGrade teacher base as distribution)
   - Data moat strategy
   - Risks and mitigations
3. **Write a backlog-ready spec** for the narrowest MVP of AnyQuiz

---

## How to resume

In the new session, run:
```
/office-hours
```

Then tell Claude: "Read `.claude/handoff_anyquiz_anysubject.md` and resume the adversarial 
office hours for AnyQuiz and AnySubject. We left off after Q6 Future-Fit with all premises 
agreed. Continue from the Premise Challenge phase and finish with the design doc."

---

## Also in scope for this session: Supabase integration for AnyGrade

The web app scaffold is at `apps/web/` (Next.js 15, TypeScript, Tailwind, shadcn/ui).

It has NO backend connection yet. Tasks:
1. Create or connect a Supabase project
2. Define initial schema: `teachers`, `classes`, `assessments`, `submissions`, `students`
3. Generate TypeScript types from schema
4. Wire `@supabase/supabase-js` client into Next.js app
5. Build teacher dashboard UI (Milestone 4 in the roadmap)

The user's email is andrewjosephpweber@gmail.com (for Supabase account lookup).

---

## OCR experiment status (separate track, do not block on this)

Running GOT-OCR2.0 tests on scanned handwritten engineering exam PDFs.  
PDFs are at: `U:\gDrive\Ventures\AnyGrade\OCRtest\`  
Files: `quiz_dynamics_yellowpad_stu1.pdf`, `activity_dynamics_bondpaper_stu1.pdf`, 
`exam_dynamics_lowqualitypaper.pdf`

OCR accuracy gate: need ≥85% on boxed final answers before building the grading pipeline.  
This is a parallel track — Supabase integration does NOT wait for OCR results.
