from pydantic import BaseModel
from typing import List

class Component(BaseModel):
    label: str
    raw_score: float
    max_score: float
    converts_to: float

class Subject(BaseModel):
    subject_id: str
    components: List[Component]

class StudentInput(BaseModel):
    student_id: str
    name: str
    subjects: List[Subject]