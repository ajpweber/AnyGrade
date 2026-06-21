from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import exams, papers, answers, tokens

app = FastAPI(title="AnyGrade API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exams.router, prefix="/exams", tags=["exams"])
app.include_router(papers.router, prefix="/exams", tags=["papers"])
app.include_router(answers.router, prefix="/student-answers", tags=["answers"])
app.include_router(tokens.router, prefix="/access-tokens", tags=["tokens"])


@app.get("/health")
def health():
    return {"status": "ok"}
