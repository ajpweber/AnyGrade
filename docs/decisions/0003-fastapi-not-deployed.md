# ADR 0003 — FastAPI Service Not Deployed in Production

**Status:** Resolved — Option B was already implemented  
**Date:** 2026-06-26

---

## Context

The original plan called for a FastAPI service (Python) deployed on Railway to handle:
- Email delivery via Resend
- Database writes for exams, papers, answers, and access tokens

As of 2026-06-26, no Railway project exists. The FastAPI service runs locally via Docker Compose but has never been deployed. The Railway account was confirmed empty on first inspection.

The grading pipeline was separately built inside Next.js API routes (Claude Vision) and is working in production on Vercel. That part is unaffected.

What is currently unconfirmed in production:
- Email delivery (Resend calls live in FastAPI)
- Any database writes that go through the FastAPI routers rather than direct Supabase client calls from Next.js

---

## Resolution

Option B was implemented without being explicitly decided — email delivery (Resend), Supabase storage uploads, and correction task DB writes all live inside the Next.js `/api/send-corrections` route. No Next.js code calls `process.env.API_URL` or the FastAPI service at all.

The FastAPI service (`apps/api/`) has no active role in production. It exists as:
- A local development service (Docker Compose)
- A tested Python grading utility (`services/grading.py`) that could be called if needed
- Dead code for the routers (exams, papers, answers, tokens) which were never wired into the production frontend

## Consequences

- Production infrastructure is simpler than planned: one deploy target (Vercel), no Railway needed
- `apps/api/` routers can be considered archived — do not build new features against them without a deliberate decision to revive the service
- If the Python grading logic in `services/grading.py` is ever needed in production, it would need to be either deployed (Railway) or rewritten in TypeScript and moved into Next.js
