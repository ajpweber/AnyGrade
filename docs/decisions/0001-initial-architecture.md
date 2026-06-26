# ADR 0001 — Initial Architecture

**Status:** Accepted  
**Date:** 2026-06-21 (retroactive — written 2026-06-26 to document decisions made at project start)

---

## Context

AnyGrade needed to be built and testable quickly, by a small team (effectively one founder). The primary use case is Philippine higher-education teachers grading weekly quizzes on bond paper — mobile-friendly upload, fast turnaround, export to Excel. No enterprise scale required for v1. Key constraints: cheap infrastructure, fast iteration, no DevOps burden.

---

## Decisions

### Next.js (App Router) for the frontend
Chosen over a separate React SPA because App Router gives server-side auth checks, server actions, and API routes in one codebase. Fewer moving parts than maintaining a separate frontend + REST API for every feature.

Deployed to Vercel — zero-config deploys on push to main.

### FastAPI (Python) for the backend service
Chosen because the original grading pipeline was planned around PaddleOCR and PP-StructureV2, which are Python libraries. Python is the natural home for ML/OCR work. FastAPI was chosen over Flask/Django for its async support and automatic API docs.

Deployed via Docker (Railway target for production).

### Supabase for database, auth, and storage
Chosen over a self-managed Postgres + auth system because it provides all three (database, authentication, file storage) in one managed service with a generous free tier. Row-level security handles multi-tenant data isolation without custom middleware.

Auth strategy for v1: Supabase email/password auth for teachers. Students access results via emailed token links — no student login required.

### Resend for transactional email
Chosen for its simple API and generous free tier. Used to deliver student result emails with score and annotated paper link.

### Docker Compose for local development
Both `web` (port 3000) and `api` (port 8000) services defined in a single `docker-compose.yml`. Keeps the local environment reproducible without requiring developers to install Python + Node separately.

### Monorepo layout
`apps/web` and `apps/api` in a single repository. Chosen over separate repos because the team is one person — a monorepo avoids cross-repo coordination overhead and makes it easy to share types between frontend and backend.

---

## Consequences

- The FastAPI service must be kept alive even if the Next.js API routes handle most grading work, because it manages email delivery and database writes.
- Supabase schema changes must be coordinated carefully — no local migrations folder means changes applied via dashboard can silently diverge from what the code expects. (See ADR 0003 when migration tracking is added.)
- Vercel's 300-second function timeout is the practical ceiling for grading large batches. Heavy routes need `maxDuration = 300` set explicitly.
