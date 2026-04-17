from fastapi import FastAPI
from analyser import analyse_student
from models import StudentInput

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "OK"}

@app.post("/analyse")
def analyse(data: StudentInput):
    result = analyse_student(data.dict())
    return result