"""
OCR pipeline using PaddleOCR + template matching.

Flow per paper:
  1. blur_check        — reject unreadable images early
  2. perspective_fix   — correct phone camera distortion vs blank questionnaire
  3. extract_regions   — template match to find answer areas per item
  4. ocr_regions       — PaddleOCR on each cropped region
  5. annotate          — draw bounding boxes on original for teacher/student view
"""

import cv2
import numpy as np
from PIL import Image
from dataclasses import dataclass
from paddleocr import PaddleOCR

# Lazy-init — PaddleOCR takes ~3s to load; only load once per worker
_ocr: PaddleOCR | None = None


def _get_ocr() -> PaddleOCR:
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr


@dataclass
class ExtractionResult:
    item_number: int
    text: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x, y, w, h in original image coords


@dataclass
class PaperExtractionResult:
    items: list[ExtractionResult]
    annotated_image: np.ndarray  # BGR image with bounding boxes drawn
    blur_score: float
    rejected: bool
    rejection_reason: str | None


def blur_check(image: np.ndarray, threshold: float = 100.0) -> tuple[bool, float]:
    """
    Returns (is_sharp, laplacian_variance).
    Images below threshold are too blurry for reliable OCR.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return score >= threshold, score


def perspective_fix(
    paper: np.ndarray, template: np.ndarray
) -> np.ndarray:
    """
    Align paper image to the blank questionnaire template using ORB feature matching.
    Returns the warped paper image in the same perspective as the template.
    """
    gray_paper = cv2.cvtColor(paper, cv2.COLOR_BGR2GRAY)
    gray_tmpl = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

    orb = cv2.ORB_create(nfeatures=2000)
    kp1, des1 = orb.detectAndCompute(gray_tmpl, None)
    kp2, des2 = orb.detectAndCompute(gray_paper, None)

    if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
        # Cannot match — return paper as-is
        return paper

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda m: m.distance)[:50]

    if len(matches) < 4:
        return paper

    src_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

    H, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
    if H is None:
        return paper

    h, w = template.shape[:2]
    return cv2.warpPerspective(paper, H, (w, h))


def extract_regions(
    aligned_paper: np.ndarray,
    template: np.ndarray,
    answer_regions: list[dict],
) -> list[tuple[int, np.ndarray]]:
    """
    Crop answer regions from the aligned paper.
    answer_regions: [{item, x, y, w, h}] — defined by the blank questionnaire.
    Returns list of (item_number, cropped_image).
    """
    crops = []
    for region in answer_regions:
        x, y, w, h = region["x"], region["y"], region["w"], region["h"]
        # Add small padding
        pad = 4
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(aligned_paper.shape[1], x + w + pad)
        y2 = min(aligned_paper.shape[0], y + h + pad)
        crop = aligned_paper[y1:y2, x1:x2]
        crops.append((region["item"], crop))
    return crops


def ocr_crop(crop: np.ndarray) -> tuple[str, float]:
    """Run PaddleOCR on a single cropped region. Returns (text, confidence)."""
    ocr = _get_ocr()
    result = ocr.ocr(crop, cls=True)
    if not result or not result[0]:
        return "", 0.0
    # Collect all text lines, pick highest-confidence interpretation
    texts = []
    confidences = []
    for line in result[0]:
        text, conf = line[1]
        texts.append(text)
        confidences.append(conf)
    combined = " ".join(texts).strip()
    avg_conf = float(np.mean(confidences)) if confidences else 0.0
    return combined, avg_conf


def annotate_image(
    image: np.ndarray,
    extractions: list[ExtractionResult],
    answer_regions: list[dict],
) -> np.ndarray:
    """Draw answer region boxes and OCR text onto image."""
    annotated = image.copy()
    for region in answer_regions:
        x, y, w, h = region["x"], region["y"], region["w"], region["h"]
        # Find matching extraction
        match = next((e for e in extractions if e.item_number == region["item"]), None)
        color = (0, 200, 0) if (match and not match.confidence < 0.75) else (0, 100, 255)
        cv2.rectangle(annotated, (x, y), (x + w, y + h), color, 2)
        label = f"Q{region['item']}: {match.text if match else '?'}"
        cv2.putText(annotated, label, (x, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
    return annotated


def process_paper(
    paper_image: np.ndarray,
    template_image: np.ndarray,
    answer_regions: list[dict],
    blur_threshold: float = 100.0,
) -> PaperExtractionResult:
    """Full pipeline for one paper."""
    is_sharp, blur_score = blur_check(paper_image, blur_threshold)
    if not is_sharp:
        return PaperExtractionResult(
            items=[],
            annotated_image=paper_image,
            blur_score=blur_score,
            rejected=True,
            rejection_reason=f"too_blurry (score={blur_score:.1f})",
        )

    aligned = perspective_fix(paper_image, template_image)
    crops = extract_regions(aligned, template_image, answer_regions)

    extractions: list[ExtractionResult] = []
    for item_num, crop in crops:
        text, confidence = ocr_crop(crop)
        region = next(r for r in answer_regions if r["item"] == item_num)
        extractions.append(ExtractionResult(
            item_number=item_num,
            text=text,
            confidence=confidence,
            bbox=(region["x"], region["y"], region["w"], region["h"]),
        ))

    annotated = annotate_image(aligned, extractions, answer_regions)

    return PaperExtractionResult(
        items=extractions,
        annotated_image=annotated,
        blur_score=blur_score,
        rejected=False,
        rejection_reason=None,
    )
