from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from api.database import init_db
from api.router import auth, courses, assignments, resources, messages, admin, course_content
from api.settings import settings

app = FastAPI(
    title="Homework Platform API",
    description="Backend API for the Homework digital learning platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api")
app.include_router(courses.router,     prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(resources.router,   prefix="/api")
app.include_router(messages.router,        prefix="/api")
app.include_router(admin.router,           prefix="/api")
app.include_router(course_content.router,  prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def on_startup():
    init_db()


# Serve uploaded files (submissions, teacher-uploaded resources)
if os.path.isdir(settings.upload_dir_abs):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir_abs), name="uploads")

# Serve frontend as static files — must be mounted last
_frontend = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.isdir(_frontend):
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
