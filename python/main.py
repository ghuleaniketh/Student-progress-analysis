from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import StudentInput
from analyser import analyse_student

app = FastAPI(title="Student Performance Analyser", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "SPA Python Microservice"}

@app.post("/analyse")
def analyse(data: StudentInput):
    result = analyse_student(data.dict())
    return result