from pydantic import BaseModel
from typing import List, Optional


class ComponentInput(BaseModel):
    label: str
    raw_score: float
    max_score: float
    converts_to: float
    unit_covered: Optional[str] = ""


class SubjectInput(BaseModel):
    subject_id: str
    name: Optional[str] = ""
    units: Optional[List[str]] = []
    components: List[ComponentInput]


class StudentInput(BaseModel):
    student_id: str
    student_name: Optional[str] = "Student"
    subjects: List[SubjectInput]