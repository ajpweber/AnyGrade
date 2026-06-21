from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

router = APIRouter()


class GenerateTokenRequest(BaseModel):
    exam_id: str
    student_id: str


class ClaimTokenRequest(BaseModel):
    token: str
    email: str
    student_id: str


@router.post("/generate")
async def generate_token(body: GenerateTokenRequest) -> dict[str, Any]:
    """Create a one-time access token and send email to student."""
    # TODO: create access_token row, send email via Resend with 10-min signed URL
    return {"token_id": "placeholder", "email_sent": False}


@router.post("/claim")
async def claim_token(body: ClaimTokenRequest) -> dict[str, Any]:
    """
    Student submits email + student_id.
    Validates against class list, marks token used, sends email with signed URL.
    Never returns the signed URL directly — always email-only.
    """
    # TODO:
    # 1. Look up token, check not expired, not used
    # 2. Match email + student_id against students table for this exam
    # 3. If match: generate 10-min signed Supabase Storage URL
    # 4. Send via Resend, mark token used_at = now()
    # 5. Return {sent: true} — never the URL
    raise HTTPException(status_code=501, detail="Not implemented")
