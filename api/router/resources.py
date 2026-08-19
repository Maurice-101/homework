import urllib.parse
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form, Request, Body
from fastapi.responses import StreamingResponse
from typing import Optional, List
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from api.database import get_db
from api.controller import resource_controller
from api.utils.auth import get_current_user, require_role
from api.settings import settings
from api.utils import r2
from api.model.user import User

router = APIRouter(prefix="/resources", tags=["Resources"])


def _auth_serve(request: Request, token: Optional[str] = Query(None)):
    """Accept JWT from Authorization header OR ?token= query param (for iframes)."""
    raw = token
    if not raw:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            raw = auth[7:]
    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(raw, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/serve")
def serve_resource(
    key: str = Query(...),
    request: Request = None,
    token: Optional[str] = Query(None),
):
    """Proxy an R2 object through FastAPI so the browser can open/download it."""
    _auth_serve(request, token)
    try:
        content_type, stream = r2.fetch_object(key)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Object not found: {e}")

    filename = urllib.parse.quote(key.rsplit("/", 1)[-1])
    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{filename}"},
    )


@router.get("/subjects")
def get_subject_catalog(current_user: User = Depends(get_current_user)):
    """Library grouped by subject, with the grade levels available for each."""
    return resource_controller.get_subject_catalog()


@router.get("/")
def get_resources(
    subject: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    course_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return resource_controller.get_all_resources(subject, type, db, course_id_filter=course_id)


@router.post("/upload")
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    res_type: str = Form("textbook"),
    description: Optional[str] = Form(None),
    course_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")
    file_bytes = await file.read()
    return resource_controller.upload_resource(
        title=title, subject=subject, grade_level=grade_level,
        res_type=res_type, file_bytes=file_bytes, filename=file.filename,
        uploaded_by=current_user.id, db=db, description=description,
        course_id=course_id,
    )


@router.post("/upload-many")
async def upload_resources_many(
    files: List[UploadFile] = File(...),
    course_id: Optional[int] = Form(None),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    res_type: str = Form("textbook"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    """Upload several PDFs at once (e.g. course materials picked at subject-creation time)."""
    results = []
    for f in files:
        if not f.filename or not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Only PDF files accepted: {f.filename}")
        file_bytes = await f.read()
        title = f.filename.rsplit(".", 1)[0]
        results.append(resource_controller.upload_resource(
            title=title, subject=subject, grade_level=grade_level,
            res_type=res_type, file_bytes=file_bytes, filename=f.filename,
            uploaded_by=current_user.id, db=db, course_id=course_id,
        ))
    return results


@router.post("/library/attach")
def attach_library_material(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    """Link an existing R2 curriculum book/past paper to a course's materials."""
    key = payload.get("key")
    course_id = payload.get("course_id")
    if not key or not course_id:
        raise HTTPException(status_code=400, detail="key and course_id are required")
    return resource_controller.attach_library_material(key, int(course_id), current_user.id, db)


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("facilitator", "admin")),
):
    return resource_controller.delete_resource(resource_id, current_user.id, db)
