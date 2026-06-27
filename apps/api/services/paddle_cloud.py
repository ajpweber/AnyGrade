"""
Baidu AIStudio PaddleOCR cloud API client.

Abstraction layer — swap PROVIDER to "local" to use self-hosted PaddleOCR
on the same Railway instance instead. Interface stays identical.
"""

import base64
import os
import httpx
from dataclasses import dataclass


PROVIDER = os.getenv("OCR_PROVIDER", "baidu")  # "baidu" | "local"
BAIDU_API_URL = "https://aistudio.baidu.com/serving/api/v1/paddleocr"
BAIDU_TOKEN = os.getenv("BAIDU_AISTUDIO_TOKEN", "")


@dataclass
class OcrPage:
    page: int
    text_blocks: list[dict]   # [{ text, confidence, bbox: [x,y,w,h] }]
    raw: dict                 # full API response for this page


async def ocr_pdf_pages(
    pdf_bytes: bytes,
    model: str = "PaddleOCR-VL-1.6",
    use_orientation_classify: bool = True,
    use_unwarping: bool = True,
) -> list[OcrPage]:
    """
    Send PDF pages to PaddleOCR cloud API one at a time.
    Returns one OcrPage per page.
    """
    import pypdfium2 as pdfium

    results: list[OcrPage] = []

    pdf = pdfium.PdfDocument(pdf_bytes)
    for page_idx in range(len(pdf)):
        page = pdf[page_idx]
        bitmap = page.render(scale=2.0)  # 144 dpi — good balance of speed vs accuracy
        pil_image = bitmap.to_pil()

        import io
        buf = io.BytesIO()
        pil_image.save(buf, format="PNG")
        image_b64 = base64.b64encode(buf.getvalue()).decode()

        if PROVIDER == "baidu":
            ocr_page = await _baidu_ocr_image(image_b64, page_idx + 1, model, use_orientation_classify, use_unwarping)
        else:
            ocr_page = await _local_ocr_image(image_b64, page_idx + 1)

        results.append(ocr_page)

    return results


async def _baidu_ocr_image(
    image_b64: str,
    page_number: int,
    model: str,
    use_orientation_classify: bool,
    use_unwarping: bool,
) -> OcrPage:
    payload = {
        "image": image_b64,
        "model": model,
        "useDocOrientationClassify": use_orientation_classify,
        "useDocUnwarping": use_unwarping,
    }
    headers = {
        "Authorization": f"Bearer {BAIDU_TOKEN}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(BAIDU_API_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    blocks = _normalize_baidu_response(data)
    return OcrPage(page=page_number, text_blocks=blocks, raw=data)


async def _local_ocr_image(image_b64: str, page_number: int) -> OcrPage:
    """Placeholder for self-hosted PaddleOCR on Railway. Swap in when ready."""
    raise NotImplementedError("Local OCR provider not yet configured. Set OCR_PROVIDER=baidu.")


def _normalize_baidu_response(data: dict) -> list[dict]:
    """Normalize Baidu API response to our internal block format."""
    blocks = []
    for item in data.get("result", {}).get("blocks", []):
        text = item.get("text", "").strip()
        if not text:
            continue
        blocks.append({
            "text": text,
            "confidence": item.get("score", 1.0),
            "bbox": item.get("bbox", []),
        })
    return blocks
