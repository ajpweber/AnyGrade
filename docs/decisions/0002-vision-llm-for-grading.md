# ADR 0002 — Use Claude Vision for Grading Instead of PaddleOCR

**Status:** Accepted  
**Date:** 2026-06-25 (retroactive — written 2026-06-26 to document a pivot made during implementation)

---

## Context

The original plan (PLAN.md, 2026-06-21) specified PaddleOCR + PP-StructureV2 as the OCR engine. The plan included:
- Blur detection (Laplacian variance check)
- Perspective correction via OpenCV homography
- Template matching to locate answer regions per item
- PaddleOCR on each cropped region
- Target accuracy: ≥85% on answer extraction before proceeding

This approach required GPU-friendly infrastructure, non-trivial OpenCV calibration, a blank questionnaire reference image per exam, and significant tuning work before the first usable result.

The plan also defined an accuracy gate: if Milestone 1 showed <85% accuracy, the project would pivot to structured answer sheets, circled answers, or a vision LLM fallback. The LLM fallback was listed as "Option B."

---

## Decision

Skip PaddleOCR entirely and use Claude Vision (`claude-sonnet-4-6`) as the primary grading engine, called directly from Next.js API routes.

Claude reads the full scanned sheet as a PDF or image and extracts answers, identifies bounding boxes, reads student identity, and scores against a provided answer key — all in one or two API calls. No perspective correction, no region cropping, no template image required.

---

## Consequences

**Positive:**
- No PaddleOCR installation, no GPU dependency, no perspective calibration work
- Handles handwritten solutions, bubble sheets (OMR), and mixed sheets with the same code path
- Answer key can also be a photo — Claude extracts it automatically (`/api/extract-key`)
- Student identity is read off the sheet itself (`/api/extract-identity`) — no class list CSV required
- New grading strategies (cross-grading, batch detection, sheet splitting) were fast to add because each is just a prompt + API call

**Negative / risks:**
- Per-paper cost: each grading call costs Anthropic API tokens. At scale, this needs monitoring.
- Latency: Claude API calls are slower than local OCR for simple bubble sheets. Large batches hit the 300-second Vercel timeout limit.
- Accuracy depends on Claude's vision quality, not a tunable local model. Hard to debug failures — the model is a black box.
- The FastAPI `services/ocr.py` file exists but its current state is unclear — it may be dead code.

**Open question:** The Python `grading.py` (MCQ + numeric grader) is still present and tested. It is unclear whether it is called in production or whether Claude Vision now handles all scoring. This should be clarified and documented in ADR 0003 once resolved.
