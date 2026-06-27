"""
/ocr/extract-key — receive a PDF (answer key), run PaddleOCR,
extract the canonical (num, question, answer) table.

Used by the Next.js extract-key flow for complex PDFs where
Claude Vision struggles with table structure.
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from services.paddle_cloud import ocr_pdf_pages

router = APIRouter()


class KeyItem(BaseModel):
    num: int
    question: str | None
    answer: str


class ExtractKeyResponse(BaseModel):
    items: list[KeyItem]
    warnings: list[str]
    sourceType: str   # "composite" | "key-only"


@router.post("/ocr/extract-key", response_model=ExtractKeyResponse)
async def extract_key(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    pages = await ocr_pdf_pages(pdf_bytes)

    all_blocks = []
    for page in pages:
        all_blocks.extend(page.text_blocks)

    items, warnings, source_type = _parse_answer_table(all_blocks)

    if not items:
        warnings.append("No answer key detected — document may be a blank template or questions only.")

    return ExtractKeyResponse(items=items, warnings=warnings, sourceType=source_type)


def _parse_answer_table(blocks: list[dict]) -> tuple[list[KeyItem], list[str], str]:
    """
    Parse OCR blocks into a (num, answer) table.
    Handles both: standalone key-only tables and composite docs with answers embedded.
    """
    import re

    items: list[KeyItem] = []
    warnings: list[str] = []
    seen_nums: set[int] = set()

    for block in blocks:
        text = block.get("text", "").strip()

        # Match patterns: "1. B", "1) B", "1 - B", "1: B", or table row "1 | B"
        match = re.match(
            r"^(\d+)[.):\-|]\s*([A-Ea-e]|True|False|[A-Z]{1,3})[\s.,]?$",
            text,
            re.IGNORECASE,
        )
        if match:
            num = int(match.group(1))
            answer = match.group(2).strip().upper()
            if num not in seen_nums:
                seen_nums.add(num)
                items.append(KeyItem(num=num, question=None, answer=answer))
            continue

        # Match inline pattern: "1. Question text ... Answer: B"
        inline = re.search(r"answer[:\s]+([A-Ea-e])", text, re.IGNORECASE)
        if inline:
            num_match = re.match(r"^(\d+)", text)
            if num_match:
                num = int(num_match.group(1))
                if num not in seen_nums:
                    seen_nums.add(num)
                    items.append(KeyItem(
                        num=num,
                        question=text[:80],
                        answer=inline.group(1).upper(),
                    ))

    items.sort(key=lambda x: x.num)

    # Detect gaps or duplicates
    nums = [item.num for item in items]
    if nums:
        expected = list(range(nums[0], nums[-1] + 1))
        missing = set(expected) - set(nums)
        if missing:
            warnings.append(f"Missing question numbers: {sorted(missing)}")

    source_type = "composite" if any(item.question for item in items) else "key-only"

    return items, warnings, source_type
