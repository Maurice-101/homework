import os, json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi import Body
from sqlalchemy.orm import Session
from typing import Optional, List
from api.database import get_db
from api.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, SubmissionCreate, GradeSubmission,
    QuestionsSetIn, AnswersSubmitIn, GradeAnswer,
)
from api.controller import assignment_controller
from api.utils.auth import get_current_user, require_role
from api.utils import r2
from api.model.user import User

# Accepted for assignment submissions and file-upload question answers alike —
# an allowlist rather than "anything" to keep this from becoming an arbitrary-file-upload hole.
_ALLOWED_ANSWER_FILE_EXT = {
    # Documents
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".rtf", ".odt",
    # Images
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
    # Audio
    ".mp3", ".wav", ".m4a", ".ogg", ".aac",
    # Video
    ".mp4", ".mov", ".avi", ".webm", ".mkv",
}

router = APIRouter(prefix="/assignments", tags=["Assignments"])

# Attachment types accepted for assignment materials (documents, images, PDFs) —
# an allowlist rather than "anything" to keep this from becoming an arbitrary-file-upload hole.
_ALLOWED_ATTACHMENT_EXT = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
}


async def _save_attachments(files: Optional[List[UploadFile]]) -> list[tuple[str, str]]:
    """Validate + upload each file to R2. Returns [(r2_key, original_filename), ...]."""
    saved = []
    for f in files or []:
        if not f or not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in _ALLOWED_ATTACHMENT_EXT:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {f.filename}")
        content = await f.read()
        key = r2.upload_file(content, f.filename, prefix="assignments")
        saved.append((key, f.filename))
    return saved


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
    attachment_files: Optional[List[UploadFile]] = File(None),
    status: str = Form("draft"),
    available_from: Optional[str] = Form(None),
    time_limit_minutes: Optional[int] = Form(None),
    max_attempts: int = Form(1),
    randomize_questions: bool = Form(False),
    randomize_choices: bool = Form(False),
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
    avail_dt = None
    if available_from:
        try:
            avail_dt = datetime.fromisoformat(available_from.replace("Z", "+00:00"))
        except Exception:
            avail_dt = None

    # Legacy single-file field, kept for backward compat with any existing callers
    file_path = None
    if attachment_file and attachment_file.filename:
        if not attachment_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted for attachment")
        content = await attachment_file.read()
        file_path = r2.upload_file(content, attachment_file.filename, prefix="assignments")

    saved_files = await _save_attachments(attachment_files)

    data = AssignmentCreate(
        title=title, description=description, course_id=course_id,
        due_date=dt, assignment_type=assignment_type,
        max_score=max_score, is_published=is_published,
        attachment_url=attachment_url,
        status=status, available_from=avail_dt, time_limit_minutes=time_limit_minutes,
        max_attempts=max_attempts, randomize_questions=randomize_questions,
        randomize_choices=randomize_choices,
    )
    return assignment_controller.create_assignment(data, current_user.id, db,
                                                    attachment_path=file_path, attachment_files=saved_files)


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
    attachment_files: Optional[List[UploadFile]] = File(None),
    status: Optional[str] = Form(None),
    available_from: Optional[str] = Form(None),
    time_limit_minutes: Optional[int] = Form(None),
    max_attempts: Optional[int] = Form(None),
    randomize_questions: Optional[bool] = Form(None),
    randomize_choices: Optional[bool] = Form(None),
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
    avail_dt = None
    if available_from:
        try:
            avail_dt = datetime.fromisoformat(available_from.replace("Z", "+00:00"))
        except Exception:
            avail_dt = None

    file_path = None
    if attachment_file and attachment_file.filename:
        if not attachment_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files accepted for attachment")
        content = await attachment_file.read()
        file_path = r2.upload_file(content, attachment_file.filename, prefix="assignments")

    saved_files = await _save_attachments(attachment_files)

    data = AssignmentUpdate(
        title=title, description=description, due_date=dt,
        assignment_type=assignment_type, max_score=max_score,
        is_published=is_published, attachment_url=attachment_url,
        status=status, available_from=avail_dt, time_limit_minutes=time_limit_minutes,
        max_attempts=max_attempts, randomize_questions=randomize_questions,
        randomize_choices=randomize_choices,
    )
    return assignment_controller.update_assignment(assignment_id, data, current_user.id, db,
                                                   attachment_path=file_path, attachment_files=saved_files)


@router.delete("/{assignment_id}/attachments/{attachment_id}")
def delete_attachment(assignment_id: int, attachment_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.delete_attachment(assignment_id, attachment_id, current_user.id, db)


@router.post("/{assignment_id}/submit")
def submit(assignment_id: int, data: SubmissionCreate, db: Session = Depends(get_db),
           current_user: User = Depends(require_role("student"))):
    return assignment_controller.submit_assignment(assignment_id, current_user.id, data, db)


@router.post("/{assignment_id}/submit-file")
async def submit_file(assignment_id: int, file: UploadFile = File(...),
                      db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("student"))):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_ANSWER_FILE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")
    content = await file.read()
    key = r2.upload_file(content, file.filename, prefix="submissions")
    return assignment_controller.submit_file(assignment_id, current_user.id, key, db)


@router.get("/{assignment_id}/submissions")
def submissions(assignment_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.get_submissions(assignment_id, db)


@router.post("/submissions/{submission_id}/grade")
def grade(submission_id: int, data: GradeSubmission, db: Session = Depends(get_db),
          current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.grade_submission(submission_id, data, db)


# ── Question builder ─────────────────────────────────────────────────────────

@router.put("/{assignment_id}/questions")
def save_questions(assignment_id: int, payload: QuestionsSetIn, db: Session = Depends(get_db),
                   current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.save_questions(assignment_id, payload, current_user.id, db)


@router.get("/{assignment_id}/questions")
def get_questions(assignment_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    if current_user.role == "student":
        return assignment_controller.get_questions_for_student(assignment_id, current_user.id, db)
    return assignment_controller.get_questions_for_facilitator(assignment_id, current_user.id, db)


@router.post("/{assignment_id}/answers")
async def submit_answers(
    assignment_id: int,
    answers: str = Form("[]"),                       # JSON-encoded list of {question_id, answer_text, selected_option_ids, matching_answers}
    file_question_ids: List[int] = Form(default=[]),  # parallel to `files`, below
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    try:
        parsed = json.loads(answers)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid answers payload")
    payload = AnswersSubmitIn(answers=parsed)

    file_answers = {}
    for qid, f in zip(file_question_ids, files):
        if not f or not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in _ALLOWED_ANSWER_FILE_EXT:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {f.filename}")
        content = await f.read()
        key = r2.upload_file(content, f.filename, prefix="submissions")
        file_answers[qid] = (key, f.filename)

    return assignment_controller.submit_answers(assignment_id, current_user.id, payload, file_answers, db)


@router.get("/submissions/{submission_id}")
def submission_detail(submission_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    return assignment_controller.get_submission_detail(submission_id, current_user.id, current_user.role, db)


@router.post("/answers/{response_id}/grade")
def grade_answer(response_id: int, data: GradeAnswer, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("facilitator", "admin"))):
    return assignment_controller.grade_question_response(response_id, data, current_user.id, db)
