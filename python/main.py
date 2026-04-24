import os
import logging
import re
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import ValidationError
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from models import StudentInput, MarksDocument, AnalysisDocument
from analyser import analyse_student
from llm import get_feedback
from rag import build_prompt
from voice import speech_to_text, text_to_speech
import ingest as ingest_module
import db as db_module
from db import connect_db, close_db

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("spa")


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="Student Performance Analyser", lifespan=lifespan)

# ── CORS ─────────────────────────────────────────────────────────────────────
orign1 = os.getenv("CORS_ORIGIN")
origin2 = os.getenv("CORS_ORIGIN2")
CORS_ORIGINS = [
    os.getenv("CORS_ORIGIN"),
    os.getenv("CORS_ORIGIN2"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error handlers ────────────────────────────────────────────────────────────

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    body = await request.body()
    logger.error("Validation error. Body: %s | Error: %s", body.decode(), exc)
    raise HTTPException(status_code=422, detail=exc.errors())

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc, exc_info=True)
    raise HTTPException(status_code=500, detail=str(exc))


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Main analysis endpoint ────────────────────────────────────────────────────

SUBJECTS_CONFIG = [
    {
        "subject_id": "CSE208",
        "name": "Probability & Statistics",
        "units": [
            "Unit I – Introduction to Probability",
            "Unit II – Random Variables & Distributions",
            "Unit III – Joint Probability & CLT",
            "Unit IV – Descriptive Statistics",
            "Unit V – Linear Regression & Statistical Inference",
        ],
        "components": [
            {"label": "CLA 1",   "max_score": 100, "converts_to": 10, "unit_covered": "Unit I"},
            {"label": "CLA 2",   "max_score": 100, "converts_to": 10, "unit_covered": "Unit II"},
            {"label": "CLA 3",   "max_score": 100, "converts_to": 10, "unit_covered": "Unit III"},
            {"label": "Mid",     "max_score": 100, "converts_to": 20, "unit_covered": "Unit I & II"},
            {"label": "End Sem", "max_score": 100, "converts_to": 50, "unit_covered": "All Units"},
        ],
    },
    {
        "subject_id": "CSE209",
        "name": "Database Management System",
        "units": [
            "ER Model & Relational Model",
            "SQL & Relational Algebra",
            "Normalization",
            "Transactions & Concurrency",
            "Lab – Queries & Project",
        ],
        "components": [
            {"label": "Mid (/25)",        "max_score": 25,  "converts_to": 20, "unit_covered": "Unit I & II"},
            {"label": "CLA 1 (/10)",      "max_score": 10,  "converts_to": 5,  "unit_covered": "Unit I"},
            {"label": "CLA 2 (/10)",      "max_score": 10,  "converts_to": 5,  "unit_covered": "Unit II"},
            {"label": "Lab Performance",  "max_score": 50,  "converts_to": 20, "unit_covered": "Lab"},
            {"label": "Final Exam (/50)", "max_score": 50,  "converts_to": 30, "unit_covered": "All Units"},
            {"label": "Project (/50)",    "max_score": 50,  "converts_to": 20, "unit_covered": "Lab & Project"},
        ],
    },
    {
        "subject_id": "FULLSTACK",
        "name": "Full Stack Development",
        "units": ["React", "Node & Express", "MongoDB", "Auth & Security", "Final Project"],
        "components": [
            {"label": "CLA 1",         "max_score": 20, "converts_to": 20, "unit_covered": "React"},
            {"label": "CLA 2",         "max_score": 20, "converts_to": 20, "unit_covered": "Node & Express"},
            {"label": "CLA 3",         "max_score": 20, "converts_to": 20, "unit_covered": "Auth & Security"},
            {"label": "MongoDB",       "max_score": 20, "converts_to": 20, "unit_covered": "MongoDB"},
            {"label": "Final Project", "max_score": 20, "converts_to": 20, "unit_covered": "All"},
        ],
    },
    {
        "subject_id": "CSE205",
        "name": "Hands on with Python",
        "units": ["Python Basics", "Functions & OOP", "Libraries", "End Sem Project"],
        "components": [
            {"label": "CLA 1 (/30)",     "max_score": 30,  "converts_to": 10, "unit_covered": "Python Basics"},
            {"label": "CLA 2 (/30)",     "max_score": 30,  "converts_to": 15, "unit_covered": "Functions & OOP"},
            {"label": "CLA 3 (/30)",     "max_score": 30,  "converts_to": 25, "unit_covered": "Libraries"},
            {"label": "End Sem Project", "max_score": 100, "converts_to": 50, "unit_covered": "Full Project"},
        ],
    },
    {
        "subject_id": "CODING",
        "name": "Coding Skills",
        "units": ["Data Structures", "Algorithms", "Problem Solving", "Lab Practice", "Project & Viva"],
        "components": [
            {"label": "CLA 1",          "max_score": 10, "converts_to": 10, "unit_covered": "Data Structures"},
            {"label": "CLA 2",          "max_score": 10, "converts_to": 10, "unit_covered": "Algorithms"},
            {"label": "CLA 3",          "max_score": 10, "converts_to": 10, "unit_covered": "Problem Solving"},
            {"label": "Lab",            "max_score": 20, "converts_to": 20, "unit_covered": "Lab Practice"},
            {"label": "Project & Viva", "max_score": 50, "converts_to": 50, "unit_covered": "Full Project"},
        ],
    },
]


@app.post("/analyse")
async def analyse(payload: StudentInput):
    student_id      = payload.student_id
    student_name    = payload.student_name
    timetable       = payload.timetable or []
    collection_name = payload.collection_name

    # Enrich subjects with config metadata
    enriched_subjects = []
    for s in payload.subjects:
        config  = next((c for c in SUBJECTS_CONFIG if c["subject_id"] == s.subject_id), None)
        enriched = s.dict()
        enriched["name"]  = config["name"]  if config else s.subject_id
        enriched["units"] = config["units"] if config else []
        for i, comp in enumerate(enriched["components"]):
            comp["unit_covered"] = (
                config["components"][i]["unit_covered"]
                if config and i < len(config["components"])
                else comp.get("unit_covered", "")
            )
        enriched_subjects.append(enriched)

    # Resolve timetable: fill human-readable subject name from config
    subject_name_map = {c["subject_id"]: c["name"] for c in SUBJECTS_CONFIG}
    timetable_enriched = []
    for entry in timetable:
        e = entry.dict() if hasattr(entry, "dict") else dict(entry)
        if not e.get("subject"):
            e["subject"] = subject_name_map.get(e["subject_id"], e["subject_id"])
        timetable_enriched.append(e)

    # Save raw marks to MongoDB
    marks_col = db_module.db["marks"]
    await marks_col.find_one_and_update(
        {"studentId": student_id},
        {"$set": {
            "studentId":   student_id,
            "studentName": student_name,
            "subjects":    [s.dict() for s in payload.subjects],
            "createdAt":   __import__("datetime").datetime.utcnow(),
        }},
        upsert=True,
    )

    # Run analysis
    result = analyse_student({
        "student_id":    student_id,
        "student_name":  student_name,
        "subjects":      enriched_subjects,
        "timetable":     timetable_enriched,
        "collection_name": collection_name,
    })

    # ── Call LLM for personalized feedback ───────────────────────────────────
    try:
        prompt = build_prompt(result, collection_name=collection_name)
        logger.info("LLM prompt built, calling get_feedback...")
        personalized_feedback = await get_feedback(prompt)
        logger.info("LLM feedback received (%d chars)", len(personalized_feedback or ""))
    except Exception as e:
        logger.error("LLM feedback failed: %s", e, exc_info=True)
        personalized_feedback = None

    result["personalized_feedback"] = personalized_feedback

    # Save analysis result to MongoDB
    analysis_col = db_module.db["analyses"]
    await analysis_col.find_one_and_update(
        {"studentId": student_id},
        {"$set": {
            "studentId":             student_id,
            "studentName":           student_name,
            "overall_percentage":    result.get("overall_percentage"),
            "grade":                 result.get("grade"),
            "subject_results":       result.get("subject_results", []),
            "weak_subjects":         result.get("weak_subjects", []),
            "strong_subjects":       result.get("strong_subjects", []),
            "recommendations":       result.get("overall_recommendations", []),
            "personalized_feedback": personalized_feedback,
            "createdAt":             __import__("datetime").datetime.utcnow(),
        }},
        upsert=True,
    )

    return result


# ── PDF ingestion ─────────────────────────────────────────────────────────────

@app.post("/ingest")
async def ingest_syllabus(
    file: UploadFile = File(...),
    collection_name: str = Form("syllabus_default"),
):
    contents = await file.read()
    result = ingest_module.ingest_pdf(
        pdf_bytes=contents,
        collection_name=collection_name,
    )
    return result


# ── Collections ───────────────────────────────────────────────────────────────

@app.get("/collections")
async def get_collections():
    try:
        collections = ingest_module.list_collections()
        return {"collections": collections}
    except Exception as e:
        logger.error("Collections error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch collections")


# ── Voice: STT ────────────────────────────────────────────────────────────────

@app.post("/voice/stt")
async def stt(
    audio: UploadFile = File(...),
    language: str = Form("en-IN"),
):
    audio_bytes = await audio.read()
    transcript  = await speech_to_text(audio_bytes=audio_bytes, language=language)
    return {"transcript": transcript}


# ── Voice: TTS ────────────────────────────────────────────────────────────────

@app.post("/voice/tts")
async def tts(
    text: str = Form(...),
    language: str = Form("en-IN"),
):
    # Strip markdown so TTS reads clean speech
    clean = re.sub(r'[#*_`]', '', text)
    clean = re.sub(r'-{2,}', '', clean)
    clean = re.sub(r'^\s*[-•]\s*', '', clean, flags=re.MULTILINE)
    clean = re.sub(r'\n{3,}', '\n\n', clean).strip()

    audio_bytes = await text_to_speech(text=clean, language=language)
    return Response(content=audio_bytes, media_type="audio/wav")


# ── Voice: Ask ────────────────────────────────────────────────────────────────

@app.post("/voice/ask")
async def voice_ask(request: Request):
    body            = await request.json()
    question        = body.get("question", "")
    analysis_result = body.get("analysis_result", {})
    language        = body.get("language", "en-IN")

    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    context = ""
    if analysis_result:
        context = (
            f"Student: {analysis_result.get('student_name', 'Student')}\n"
            f"Overall Grade: {analysis_result.get('grade', 'N/A')} "
            f"({analysis_result.get('overall_percentage', 0):.1f}%)\n"
            f"Weak subjects: {', '.join(analysis_result.get('weak_subjects', []))}\n"
            f"Strong subjects: {', '.join(analysis_result.get('strong_subjects', []))}\n"
        )

    prompt = (
        f"You are a helpful student performance assistant. "
        f"Answer concisely in 2-3 sentences.\n\n"
        f"Student context:\n{context}\n"
        f"Question: {question}"
    )

    answer      = await get_feedback(prompt)
    audio_bytes = await text_to_speech(text=answer, language=language)

    return {
        "answer":       answer,
        "audio_base64": __import__("base64").b64encode(audio_bytes).decode(),
    }