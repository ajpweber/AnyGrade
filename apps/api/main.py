from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import split, ocr

app = FastAPI(title="AnyGrade Processing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://anygrade.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(split.router, tags=["batch"])
app.include_router(ocr.router, tags=["ocr"])


@app.get("/health")
def health():
    return {"status": "ok"}
