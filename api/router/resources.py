import urllib.parse
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from typing import Optional
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return resource_controller.get_all_resources(subject, type, db)


@router.post("/upload")
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    res_type: str = Form("textbook"),
    description: Optional[str] = Form(None),
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
    )
