"""
Grading engine — pure functions, no DB or IO.
Supports MCQ (exact match) and numeric (tolerance match) question types.
"""

import re
from dataclasses import dataclass
from typing import Literal


@dataclass
class GradeResult:
    is_correct: bool
    needs_review: bool
    reason: str


def parse_numeric(text: str) -> float | None:
    """Extract a number from OCR text. Handles units, commas, scientific notation."""
    if not text:
        return None
    # Remove common units and whitespace
    cleaned = re.sub(r"[a-zA-Z°/²³]+", "", text.strip())
    # Normalize comma as decimal separator (common in PH)
    cleaned = cleaned.replace(",", ".")
    # Remove extra spaces
    cleaned = re.sub(r"\s+", "", cleaned)
    # Try to extract the last valid number (often the final answer)
    matches = re.findall(r"-?\d+\.?\d*(?:[eE][+-]?\d+)?", cleaned)
    if not matches:
        return None
    try:
        return float(matches[-1])
    except ValueError:
        return None


def grade_mcq(extracted: str, correct: str) -> GradeResult:
    """Exact match, case-insensitive, stripped."""
    if not extracted or not extracted.strip():
        return GradeResult(is_correct=False, needs_review=True, reason="empty_extraction")
    match = extracted.strip().upper() == correct.strip().upper()
    return GradeResult(is_correct=match, needs_review=False, reason="mcq_match")


def grade_numeric(extracted: str, correct: str, tolerance: float = 0.0) -> GradeResult:
    """
    Numeric match with tolerance.
    tolerance=0.5 means ±0.5 of the correct value is accepted.
    tolerance=0.0 means exact numeric match.
    """
    if not extracted or not extracted.strip():
        return GradeResult(is_correct=False, needs_review=True, reason="empty_extraction")

    extracted_val = parse_numeric(extracted)
    correct_val = parse_numeric(correct)

    if correct_val is None:
        return GradeResult(is_correct=False, needs_review=True, reason="unparseable_key")

    if extracted_val is None:
        return GradeResult(is_correct=False, needs_review=True, reason="unparseable_extraction")

    is_correct = abs(extracted_val - correct_val) <= tolerance
    return GradeResult(is_correct=is_correct, needs_review=False, reason="numeric_match")


def grade_item(
    extracted: str,
    correct: str,
    question_type: Literal["mcq", "numeric"],
    tolerance: float = 0.0,
    confidence: float = 1.0,
    confidence_threshold: float = 0.75,
) -> GradeResult:
    """
    Top-level grading function. Flags for teacher review when OCR confidence is low.
    """
    result = (
        grade_mcq(extracted, correct)
        if question_type == "mcq"
        else grade_numeric(extracted, correct, tolerance)
    )

    # Low OCR confidence overrides — flag even if it graded fine
    if confidence < confidence_threshold and not result.needs_review:
        return GradeResult(
            is_correct=result.is_correct,
            needs_review=True,
            reason=f"low_confidence_{confidence:.2f}",
        )

    return result
