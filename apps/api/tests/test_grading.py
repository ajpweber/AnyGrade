import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from services.grading import grade_mcq, grade_numeric, grade_item, parse_numeric


class TestParseNumeric:
    def test_plain_number(self):
        assert parse_numeric("42.7") == pytest.approx(42.7)

    def test_with_unit(self):
        assert parse_numeric("42.7 kJ") == pytest.approx(42.7)

    def test_comma_decimal(self):
        assert parse_numeric("42,7") == pytest.approx(42.7)

    def test_scientific_notation(self):
        assert parse_numeric("4.27e1") == pytest.approx(42.7)

    def test_negative(self):
        assert parse_numeric("-12.5 °C") == pytest.approx(-12.5)

    def test_takes_last_number(self):
        # OCR sometimes reads "= 42.7" or "ans: 42.7"
        assert parse_numeric("ans 42.7") == pytest.approx(42.7)

    def test_empty(self):
        assert parse_numeric("") is None

    def test_no_number(self):
        assert parse_numeric("abc") is None

    def test_ocr_one_vs_l(self):
        # "l" misread as "1"
        assert parse_numeric("4l.7") is None  # ambiguous — treat as unparseable


class TestGradeMCQ:
    def test_correct(self):
        r = grade_mcq("B", "B")
        assert r.is_correct is True
        assert r.needs_review is False

    def test_wrong(self):
        r = grade_mcq("A", "B")
        assert r.is_correct is False

    def test_case_insensitive(self):
        assert grade_mcq("b", "B").is_correct is True

    def test_whitespace(self):
        assert grade_mcq("  B  ", "B").is_correct is True

    def test_empty(self):
        r = grade_mcq("", "B")
        assert r.is_correct is False
        assert r.needs_review is True


class TestGradeNumeric:
    def test_exact_match(self):
        r = grade_numeric("42.7", "42.7", tolerance=0.0)
        assert r.is_correct is True

    def test_within_tolerance(self):
        r = grade_numeric("42.9", "42.7", tolerance=0.5)
        assert r.is_correct is True

    def test_outside_tolerance(self):
        r = grade_numeric("43.5", "42.7", tolerance=0.5)
        assert r.is_correct is False

    def test_with_unit(self):
        r = grade_numeric("42.7 kJ", "42.7 kJ", tolerance=0.0)
        assert r.is_correct is True

    def test_empty_extraction(self):
        r = grade_numeric("", "42.7", tolerance=0.0)
        assert r.needs_review is True

    def test_comma_decimal(self):
        r = grade_numeric("42,7", "42.7", tolerance=0.0)
        assert r.is_correct is True


class TestGradeItem:
    def test_low_confidence_flags_review(self):
        # Even a correct answer gets flagged if OCR confidence is low
        r = grade_item("B", "B", "mcq", confidence=0.60, confidence_threshold=0.75)
        assert r.is_correct is True
        assert r.needs_review is True

    def test_high_confidence_no_flag(self):
        r = grade_item("B", "B", "mcq", confidence=0.95, confidence_threshold=0.75)
        assert r.needs_review is False

    def test_numeric_dispatch(self):
        r = grade_item("42.7", "42.7", "numeric", tolerance=0.0, confidence=0.9)
        assert r.is_correct is True
