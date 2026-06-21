from fastapi import APIRouter, UploadFile, File, Form
from typing import Any

router = APIRouter()


@router.post("/{exam_id}/papers")
async def upload_papers(
    exam_id: str,
    questionnaire: UploadFile = File(...),
    papers: list[UploadFile] = File(...),
    class_list: UploadFile | None = File(None),
) -> dict[str, Any]:
    """
    Accept batch paper upload. Queues OCR processing job.
    Returns job_id for polling.
    """
    # TODO: validate exam_id, store images to Supabase Storage,
    # enqueue processing jobs, parse class_list CSV
    return {"job_id": "placeholder", "total_papers": len(papers)}


@router.get("/{exam_id}/status")
async def get_status(exam_id: str) -> dict[str, Any]:
    """Poll processing status for a batch."""
    # TODO: query Supabase for ocr_status counts
    return {"completed": 0, "total": 0, "failed_papers": []}
