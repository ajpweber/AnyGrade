"""
/split-batch — receive a Supabase Storage path, fetch the PDF,
use PaddleOCR to detect student boundaries, return per-student PDF slices.

Replaces the Vercel /api/split-batch route for large files.
Response shape is identical so AnyGradePanel.tsx needs no changes.
"""

import base64
import io
import os

import httpx
import pypdfium2 as pdfium
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.paddle_cloud import ocr_pdf_pages

router = APIRouter()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class SplitBatchRequest(BaseModel):
    filePath: str       # Supabase Storage key inside the batch-uploads bucket
    nPagesPerStudent: int | None = None  # manual override: N pages per student


class SplitStudent(BaseModel):
    name: str | None
    section: str | None
    startPage: int
    endPage: int
    pdfBase64: str


class SplitBatchResponse(BaseModel):
    students: list[SplitStudent]
    totalPages: int


@router.post("/split-batch", response_model=SplitBatchResponse)
async def split_batch(body: SplitBatchRequest):
    pdf_bytes = await _fetch_from_supabase(body.filePath)

    pdf = pdfium.PdfDocument(pdf_bytes)
    total_pages = len(pdf)

    if body.nPagesPerStudent:
        segments = _segment_by_n(total_pages, body.nPagesPerStudent)
    else:
        segments = await _segment_by_ocr(pdf_bytes, total_pages)

    students = _slice_pdf(pdf, pdf_bytes, segments, total_pages)
    return SplitBatchResponse(students=students, totalPages=total_pages)


async def _fetch_from_supabase(file_path: str) -> bytes:
    """Get a signed URL from Supabase Storage and download the PDF."""
    sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/batch-uploads/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(sign_url, json={"expiresIn": 300}, headers=headers)
        if not resp.is_success:
            raise HTTPException(status_code=502, detail=f"Supabase sign URL failed: {resp.text}")
        signed_url = resp.json().get("signedURL") or resp.json().get("signedUrl")
        if not signed_url:
            raise HTTPException(status_code=502, detail="No signed URL returned from Supabase")

        dl = await client.get(f"{SUPABASE_URL}{signed_url}", timeout=120.0)
        if not dl.is_success:
            raise HTTPException(status_code=502, detail=f"Failed to download PDF: {dl.status_code}")
        return dl.content


def _segment_by_n(total_pages: int, n: int) -> list[dict]:
    """Manual override: group sequentially N pages per student."""
    segments = []
    for start in range(1, total_pages + 1, n):
        end = min(start + n - 1, total_pages)
        segments.append({"name": None, "section": None, "startPage": start, "endPage": end})
    return segments


async def _segment_by_ocr(pdf_bytes: bytes, total_pages: int) -> list[dict]:
    """
    Use PaddleOCR on each page to extract header text, then group pages
    into per-student bundles based on name header detection.
    """
    pages = await ocr_pdf_pages(pdf_bytes)

    segments: list[dict] = []
    current_name: str | None = None
    current_section: str | None = None
    current_start: int = 1

    for ocr_page in pages:
        page_num = ocr_page.page
        name, section = _extract_header(ocr_page.text_blocks)

        is_new_student = (
            name is not None and
            name != current_name and
            page_num > 1
        )

        if is_new_student:
            segments.append({
                "name": current_name,
                "section": current_section,
                "startPage": current_start,
                "endPage": page_num - 1,
            })
            current_name = name
            current_section = section
            current_start = page_num
        elif page_num == 1:
            current_name = name
            current_section = section

    # Close final segment
    segments.append({
        "name": current_name,
        "section": current_section,
        "startPage": current_start,
        "endPage": total_pages,
    })

    return segments


def _extract_header(blocks: list[dict]) -> tuple[str | None, str | None]:
    """
    Look for name and section in the top portion of a page's OCR blocks.
    Matches patterns like "Name: Vargas, Tom" or "Name & Section: ..."
    """
    import re

    name: str | None = None
    section: str | None = None

    for block in blocks:
        text = block.get("text", "")

        name_match = re.search(
            r"(?:name|nombre)[^:]*:\s*([A-Z][a-zA-Z,.\s]+)",
            text,
            re.IGNORECASE,
        )
        if name_match and not name:
            name = name_match.group(1).strip()

        section_match = re.search(
            r"(?:section|sec|course|block)[^:]*:\s*([A-Z0-9\-]+)",
            text,
            re.IGNORECASE,
        )
        if section_match and not section:
            section = section_match.group(1).strip()

    return name, section


def _slice_pdf(
    pdf: pdfium.PdfDocument,
    pdf_bytes: bytes,
    segments: list[dict],
    total_pages: int,
) -> list[SplitStudent]:
    """Slice the PDF into per-student PDFs and return as base64."""
    students = []

    for seg in segments:
        start = max(1, seg["startPage"])
        end = min(total_pages, seg["endPage"])
        if start > end:
            continue

        out_pdf = pdfium.PdfDocument.new()
        out_pdf.import_pages(pdf, list(range(start - 1, end)))

        buf = io.BytesIO()
        out_pdf.save(buf)
        slice_b64 = base64.b64encode(buf.getvalue()).decode()

        students.append(SplitStudent(
            name=seg["name"],
            section=seg["section"],
            startPage=start,
            endPage=end,
            pdfBase64=slice_b64,
        ))

    return students
