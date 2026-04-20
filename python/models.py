from pydantic import BaseModel
from typing import List, Optional


class ComponentInput(BaseModel):
    label: str
    raw_score: float
    max_score: float
    converts_to: float
    unit_covered: Optional[str] = ""

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"label": "CLA 1", "raw_score": 16, "max_score": 20, "converts_to": 10, "unit_covered": "Unit I"},
                {"label": "CLA 2", "raw_score": 12, "max_score": 20, "converts_to": 10, "unit_covered": "Unit II"},
                {"label": "Assignment", "raw_score": 8, "max_score": 10, "converts_to": 5,  "unit_covered": "Unit III"},
                {"label": "End Sem",   "raw_score": 42, "max_score": 60, "converts_to": 50, "unit_covered": "Unit I & II"},
            ]
        }
    }


class SubjectInput(BaseModel):
    subject_id: str
    name: Optional[str] = ""
    units: Optional[List[str]] = []
    components: List[ComponentInput]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "subject_id": "CS301",
                    "name": "Probability and Statistics",
                    "units": ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"],
                    "components": [
                        {"label": "CLA 1",      "raw_score": 14, "max_score": 20, "converts_to": 10, "unit_covered": "Unit I"},
                        {"label": "CLA 2",      "raw_score": 10, "max_score": 20, "converts_to": 10, "unit_covered": "Unit II"},
                        {"label": "Assignment", "raw_score": 7,  "max_score": 10, "converts_to": 5,  "unit_covered": "Unit III"},
                        {"label": "End Sem",    "raw_score": 38, "max_score": 60, "converts_to": 50, "unit_covered": "Unit I & II"},
                    ]
                }
            ]
        }
    }


class ExamEntry(BaseModel):
    subject: str
    exam_date: str          # "YYYY-MM-DD"
    days_left: Optional[int] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"subject": "Probability and Statistics", "exam_date": "2025-05-10", "days_left": 19},
                {"subject": "Database Management",        "exam_date": "2025-05-14", "days_left": 23},
                {"subject": "Full Stack Development",     "exam_date": "2025-05-17", "days_left": 26},
            ]
        }
    }


class StudentInput(BaseModel):
    student_id: str
    student_name: Optional[str] = "Student"
    subjects: List[SubjectInput]
    collection_name: Optional[str] = None
    timetable: Optional[List[ExamEntry]] = []

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "student_id": "22CS001",
                    "student_name": "Arjun Sharma",
                    "collection_name": "syllabus_cs2024",
                    "timetable": [
                        {"subject": "Probability and Statistics", "exam_date": "2025-05-10"},
                        {"subject": "Database Management",        "exam_date": "2025-05-14"},
                        {"subject": "Full Stack Development",     "exam_date": "2025-05-17"},
                    ],
                    "subjects": [
                        {
                            "subject_id": "CS301",
                            "name": "Probability and Statistics",
                            "units": ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"],
                            "components": [
                                {"label": "CLA 1",      "raw_score": 14, "max_score": 20, "converts_to": 10, "unit_covered": "Unit I"},
                                {"label": "CLA 2",      "raw_score": 10, "max_score": 20, "converts_to": 10, "unit_covered": "Unit II"},
                                {"label": "Assignment", "raw_score": 7,  "max_score": 10, "converts_to": 5,  "unit_covered": "Unit III"},
                                {"label": "End Sem",    "raw_score": 38, "max_score": 60, "converts_to": 50, "unit_covered": "Unit I & II"},
                            ]
                        },
                        {
                            "subject_id": "CS302",
                            "name": "Database Management",
                            "units": ["ER Model & Relational Model", "SQL & Relational Algebra", "Normalization", "Transactions & Concurrency", "Lab"],
                            "components": [
                                {"label": "CLA 1",      "raw_score": 18, "max_score": 20, "converts_to": 10, "unit_covered": "ER Model & Relational Model"},
                                {"label": "CLA 2",      "raw_score": 9,  "max_score": 20, "converts_to": 10, "unit_covered": "SQL & Relational Algebra"},
                                {"label": "Lab",        "raw_score": 32, "max_score": 40, "converts_to": 20, "unit_covered": "Lab"},
                                {"label": "End Sem",    "raw_score": 30, "max_score": 60, "converts_to": 50, "unit_covered": "Normalization"},
                            ]
                        },
                        {
                            "subject_id": "CS303",
                            "name": "Full Stack Development",
                            "units": ["React", "Node & Express", "MongoDB", "Auth & Security"],
                            "components": [
                                {"label": "CLA 1",      "raw_score": 12, "max_score": 20, "converts_to": 10, "unit_covered": "React"},
                                {"label": "CLA 2",      "raw_score": 8,  "max_score": 20, "converts_to": 10, "unit_covered": "Node & Express"},
                                {"label": "Project",    "raw_score": 28, "max_score": 40, "converts_to": 25, "unit_covered": "Full Project"},
                                {"label": "End Sem",    "raw_score": 25, "max_score": 60, "converts_to": 50, "unit_covered": "Auth & Security"},
                            ]
                        }
                    ]
                }
            ]
        }
    }