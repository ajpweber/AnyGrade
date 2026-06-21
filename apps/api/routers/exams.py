from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

router = APIRouter()


class AnswerKeyItem(BaseModel):
    item: int
    answer: str
    type: str  # "mcq" | "numeric"
    tolerance: float = 0.0


class CreateExamRequest(BaseModel):
    teacher_token: str
    subject: str
    exam_name: str
    answer_key: list[AnswerKeyItem]


@router.post("/")
async def create_exam(body: CreateExamRequest) -> dict[str, Any]:
    # TODO: insert into Supabase exams table
    return {"id": "placeholder", "exam_name": body.exam_name}


@router.get("/{exam_id}")
async def get_exam(exam_id: str) -> dict[str, Any]:
    # TODO: fetch from Supabase
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{exam_id}/results")
async def get_results(exam_id: str) -> dict[str, Any]:
    # TODO: fetch students + scores + item analysis from Supabase
    raise HTTPException(status_code=501, detail="Not implemented")
