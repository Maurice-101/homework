from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.database import get_db
from api.schemas.user import UserUpdate
from api.controller import admin_controller
from api.utils.auth import require_role
from api.model.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    return admin_controller.platform_stats(db)


@router.get("/users")
def list_users(role: Optional[str] = Query(None), db: Session = Depends(get_db),
               current_user: User = Depends(require_role("admin"))):
    return admin_controller.list_users(role, db)


@router.put("/users/{user_id}")
def edit_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db),
              current_user: User = Depends(require_role("admin"))):
    return admin_controller.update_user(user_id, data, db)


@router.put("/users/{user_id}/toggle")
def toggle(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    return admin_controller.toggle_user(user_id, db)


@router.get("/courses")
def courses(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    return admin_controller.all_courses(db)


@router.put("/courses/{course_id}/approve")
def approve(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    return admin_controller.approve_course(course_id, db)
