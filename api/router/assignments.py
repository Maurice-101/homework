import os, uuid, json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi import Body
from sqlalchemy.orm import Session
from typing import Optional
from api.database import get_db
from api.schemas.assignment import AssignmentCreate, AssignmentUpdate, SubmissionCreate, GradeSubmission
from api.controller import assignment_controller
from api.utils.auth import get_current_user, require_role
from api.model.user import User
from api.settings import settings

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.get("/")
def get_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "student":
        return assignment_controller.get_assignments_student(current_user.id, db)
    return assignment_controller.get_assignments_facilitator(current_user.id, db)


@router.post("/")
async def create(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    course_id: Optional[int] = Form(None),
    due_date: Optional[str] = Form(None),
    assignment_type: str = Form("assignment"),
    max_score: float = Form(100.0),
    is_published: bool = Form(True),
    attachment_url: Optional[str] = Form(None),
    attachment_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    from datetime import datetime
    dt = None
    if due_date:
        try:
            dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except Exception:
            dt = None

    file_path = None
    if attachment_file and attachment_file.filename:
        if not attachment_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted for attachment")
        fname = f"{uuid.uuid4()}_{attachment_file.filename}"
        dest = os.path.join(settings.upload_dir_abs, "assignments", fname)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        content = await attachment_file.read()
        with open(dest, "wb") as f:
            f.write(content)
        file_path = f"assignments/{fname}"

    data = AssignmentCreate(
        title=title, description=description, course_id=course_id,
        due_date=dt, assignment_type=assignment_type,
        max_score=max_score, is_published=is_published,
        attachment_url=attachment_url,
    )
    return assignment_controller.create_assignment(data, current_user.id, db, attachment_path=file_path)


@router.put("/{assignment_id}")
async def update(
    assignment_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    due_date: Optional[str] = Form(None),
    assignment_type: Optional[str] = Form(None),
    max_score: Optional[float] = Form(None),
    is_published: Optional[bool] = Form(None),
    attachment_url: Optional[str] = Form(None),
    attachment_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    from datetime import datetime
    dt = None
    if due_date:
        try:
            dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except Exception:
            dt = None

    file_path = None
    if attachment_file and attachment_file.filename:
        if not attachment_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted for attachment")
        fname = f"{uuid.uuid4()}_{attachment_file.filename}"
        dest = os.path.join(settings.upload_dir_abs, "assignments", fname)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        content = await attachment_file.read()
        with open(dest, "wb") as f:
            f.write(content)
        file_path = f"assignments/{fname}"

    data = AssignmentUpdate(
        title=title, description=description, due_date=dt,
        assignment_type=assignment_type, max_score=max_score,
        is_published=is_published, attachment_url=attachment_url,
    )
    return assignment_controller.update_assignment(assignment_id, data, current_user.id, db,
                                                   attachment_path=file_path)


@router.post("/{assignment_id}/submit")
def submit(assignment_id: int, data: SubmissionCreate, db: Session = Depends(get_db),
           current_user: User = Depends(require_role("student"))):
    return assignment_controller.submit_assignment(assignment_id, current_user.id, data, db)


@router.post("/{assignment_id}/submit-file")
async def submit_file(assignment_id: int, file: UploadFile = File(...),
                      db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("student"))):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")
    filename = f"{uuid.uuid4()}_{file.filename}"
    dest = os.path.join(settings.upload_dir_abs, "submissions", filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return assignment_controller.submit_file(assignment_id, current_user.id,
                                             f"submissions/{filename}", db)


@router.get("/{assignment_id}/submissions")
def submissions(assignment_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.get_submissions(assignment_id, db)


@router.post("/submissions/{submission_id}/grade")
def grade(submission_id: int, data: GradeSubmission, db: Session = Depends(get_db),
          current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.grade_submission(submission_id, data, db)
