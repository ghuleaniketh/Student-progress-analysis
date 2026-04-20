import os
import tempfile
import logging
import json
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.exceptions import RequestValidationError

from models import StudentInput
from analyser import analyse_student
from ingest import ingest_pdf
from rag import build_prompt
from llm import get_feedback
from voice import speech_to_text, text_to_speech

app = FastAPI(title="Student Performance Analyser", version="2.0.0")

# logger setup
logger = logging.getLogger("spa")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


# Exception handler: Request validation (422) — logs request details and validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body_bytes = await request.body()
        body_text = body_bytes.decode("utf-8") if body_bytes else ""
        try:
            parsed_body = json.loads(body_text) if body_text else None
        except Exception:
            parsed_body = body_text
    except Exception as e:
        body_text = f"<could not read body: {e}>"
        parsed_body = None

    logger.error("Request validation error: %s %s", request.method, request.url)
    logger.error("Validation errors: %s", exc.errors())
    # headers is a Headers object — convert to dict for logging
    try:
        headers = dict(request.headers)
    except Exception:
        headers = str(request.headers)
    logger.error("Request headers: %s", headers)
    logger.error("Request body: %s", parsed_body)

    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": parsed_body, "message": "Request validation error"},
    )


# Generic exception handler — logs stack trace and returns 500
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception for request %s %s", request.method, request.url)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SPA Python Microservice v2"}


@app.post("/analyse")
async def analyse(data: StudentInput):
    # 1. Score analysis (existing logic — unchanged)
    result = analyse_student(data.dict())

    # 2. Attach timetable + collection so rag.py can use them
    result["timetable"]       = [e.dict() for e in data.timetable]
    result["collection_name"] = data.collection_name

    # 3. Build RAG prompt and call Sarvam-M
    # Use the request data's collection_name (payload was undefined)
    prompt = build_prompt(result, collection_name=data.collection_name)
    feedback = await get_feedback(prompt)
    result["personalized_feedback"] = feedback

    return result


@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    collection_name: str = Form("syllabus_default"),
):
    """Upload a syllabus PDF — chunks it and stores in ChromaDB."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        result = ingest_pdf(tmp_path, collection_name)
    finally:
        os.unlink(tmp_path)
    return result


@app.post("/voice/stt")
async def stt(
    audio: UploadFile = File(...),
    language: str = Form("en-IN"),
):
    transcript = await speech_to_text(await audio.read(), language)
    return {"transcript": transcript}


@app.post("/voice/tts")
async def tts(
    text: str = Form(...),
    language: str = Form("en-IN"),
):
    audio = await text_to_speech(text, language)
    return Response(content=audio, media_type="audio/wav")