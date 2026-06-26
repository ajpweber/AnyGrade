# Changelog

All notable changes to AnyGrade are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — newest entries on top.
One line per entry, outcome-focused. Implementation details belong in code and ADRs.

---

## [Unreleased]

## [0.3.0] — 2026-06-26

### Added
- ARCHITECTURE.md — living document describing the current system: stack, routes, API routes, workspace UI, database schema, and local dev setup
- CHANGELOG.md — this file; Keep a Changelog format, backfilled from git history
- docs/decisions/0001-initial-architecture.md — retroactive ADR for original stack choices (Next.js, FastAPI, Supabase, Resend, Docker Compose, monorepo)
- docs/decisions/0002-vision-llm-for-grading.md — retroactive ADR documenting the pivot from PaddleOCR to Claude Vision
- supabase/migrations/20260621000000_initial_schema.sql — production schema brought into version control; verified against live Supabase dashboard

### Changed
- ARCHITECTURE.md database section corrected to reflect actual production schema — exams/student_answers/access_tokens (from original plan) do not exist; actual tables are correction_tasks, submissions, assessments, and CHED curriculum tables

## [0.2.0] — 2026-06-25

### Added
- ZipGrade bubble sheet (OMR) reading — 50 questions, A–E choices, key version and student ID detection
- Handwritten solution sheet grading via Claude Vision, with bounding box locations for each found answer
- Cross-grading strategy that reads both bubble and handwritten answers from one sheet in a single pass
- Automated answer key extraction from a scanned key sheet
- Student identity extraction directly from the scanned sheet (no CSV required)
- Sheet detection — rejects uploads that don't look like answer sheets before grading starts
- Batch detection and PDF splitting — teachers can upload one PDF with all students' sheets; app splits it per student
- Token-based teacher correction flow (`/correct/[token]`)
- Student class join via shareable code (`/join/[joinCode]`)
- Workspace UI at `/workspace` — AnyQuiz, AnyGrade, and AnySubject panels in a single full-screen interface

### Changed
- Grading pipeline moved from FastAPI + PaddleOCR (planned) to Claude Vision API called from Next.js — faster to iterate, no local GPU dependency

## [0.1.0] — 2026-06-22

### Added
- Next.js web app with Supabase authentication
- Teacher dashboard at `/dashboard` with class management
- FastAPI backend scaffold with routers for exams, papers, answers, and access tokens
- Python grading engine (`grading.py`) — MCQ exact match and numeric grading with unit normalization and Philippine locale comma-decimal handling
- Docker Compose setup for local development (web + api)
- Supabase integration for auth, database, and file storage

## [0.0.1] — 2026-06-21

### Added
- Monorepo scaffold: `apps/web` (Next.js), `apps/api` (FastAPI)
- Initial project structure, environment variable templates, fixture directory
