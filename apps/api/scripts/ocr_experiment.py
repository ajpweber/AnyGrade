"""
OCR accuracy experiment — run on a folder of cropped answer images.

Usage:
  python scripts/ocr_experiment.py fixtures/crops/ --expected fixtures/expected.csv

fixtures/expected.csv format:
  filename,expected
  q1_student01.jpg,42.7
  q2_student01.jpg,B
  ...

Prints accuracy %, per-item confidence, and saves results.csv.
"""

import sys
import csv
import argparse
from pathlib import Path
import numpy as np
import cv2

sys.path.insert(0, str(Path(__file__).parent.parent))
from services.ocr import ocr_crop, blur_check


def run_experiment(crops_dir: Path, expected_csv: Path | None) -> None:
    image_paths = sorted(crops_dir.glob("*.jpg")) + sorted(crops_dir.glob("*.png"))
    if not image_paths:
        print(f"No images found in {crops_dir}")
        return

    expected: dict[str, str] = {}
    if expected_csv and expected_csv.exists():
        with open(expected_csv) as f:
            for row in csv.DictReader(f):
                expected[row["filename"]] = row["expected"]

    results = []
    correct = 0
    total = 0

    for path in image_paths:
        img = cv2.imread(str(path))
        if img is None:
            print(f"  SKIP (unreadable): {path.name}")
            continue

        is_sharp, blur_score = blur_check(img)
        text, confidence = ocr_crop(img)
        exp = expected.get(path.name, "")
        matched = text.strip().lower() == exp.strip().lower() if exp else None

        if matched is True:
            correct += 1
        if exp:
            total += 1

        results.append({
            "filename": path.name,
            "extracted": text,
            "expected": exp,
            "correct": matched,
            "confidence": f"{confidence:.3f}",
            "blur_score": f"{blur_score:.1f}",
            "sharp": is_sharp,
        })

        status = "✓" if matched else ("?" if matched is None else "✗")
        print(f"  {status} {path.name}: '{text}' (conf={confidence:.2f}, blur={blur_score:.0f})")

    print(f"\n--- Results ---")
    print(f"Total images: {len(results)}")
    if total > 0:
        print(f"Accuracy: {correct}/{total} = {correct/total*100:.1f}%")
    confidences = [float(r["confidence"]) for r in results]
    print(f"Avg confidence: {np.mean(confidences):.3f}")
    print(f"Low confidence (<0.75): {sum(1 for c in confidences if c < 0.75)}")

    out = crops_dir.parent / "ocr_results.csv"
    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("crops_dir", type=Path)
    parser.add_argument("--expected", type=Path, default=None)
    args = parser.parse_args()
    run_experiment(args.crops_dir, args.expected)
