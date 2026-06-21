from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

router = APIRouter()


class CorrectAnswerRequest(BaseModel):
    corrected_answer: str


@router.patch("/{answer_id}/correct")
async def correct_answer(answer_id: str, body: CorrectAnswerRequest) -> dict[str, Any]:
    """
    Teacher overrides an OCR extraction.
    Re-grades the item and updates student's total score.
    """
    # TODO: update student_answers, re-run grade_item, update students.raw_score
    return {"updated": True, "answer_id": answer_id}
