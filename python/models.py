from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


# ── Input models (what React sends) ──────────────────────────────────────────

class ComponentInput(BaseModel):
    label:       str
    raw_score:   float
    max_score:   float
    converts_to: float
    unit_covered: Optional[str] = ""


class SubjectInput(BaseModel):
    subject_id: str
    components: list[ComponentInput]


class TimetableEntry(BaseModel):
    subject_id: str
    subject:    Optional[str] = None   # human-readable name; auto-filled by /analyse
    exam_date:  str                    # ISO date string e.g. "2025-05-12"
    days_left:  Optional[int] = None   # auto-calculated by rag.py


class StudentInput(BaseModel):
    student_id:      str
    student_name:    Optional[str] = "Student"
    subjects:        list[SubjectInput]
    timetable:       Optional[list[TimetableEntry]] = []
    collection_name: Optional[str] = None


# ── Storage models (what goes into MongoDB) ───────────────────────────────────

class ComponentResult(BaseModel):
    label:           str
    raw_score:       float
    max_score:       float
    converts_to:     float
    converted_score: float
    unit_covered:    Optional[str] = ""


class SubjectResult(BaseModel):
    subject_id:      str
    name:            str
    total:           float
    classification:  str          # "Weak" | "Average" | "Strong"
    components:      list[ComponentResult]
    recommendations: list[str]


class MarksDocument(BaseModel):
    studentId:   str
    studentName: Optional[str]
    subjects:    list[SubjectInput]


class AnalysisDocument(BaseModel):
    studentId:            str
    studentName:          Optional[str]
    overall_percentage:   float
    grade:                str
    subject_results:      list[SubjectResult]
    weak_subjects:        list[str]
    strong_subjects:      list[str]
    recommendations:      list[str]
    personalized_feedback: Optional[str] = None