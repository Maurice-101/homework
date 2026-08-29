from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from api.database import get_db
from api.schemas.course import CourseCreate, ModuleCreate, InviteCreate, JoinCourseIn
from api.controller import course_controller
from api.utils.auth import get_current_user, require_role
from api.model.user import User

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("/")
def list_courses(subject: Optional[str] = Query(None), grade: Optional[str] = Query(None),
                 q: Optional[str] = Query(None),
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return course_controller.get_all_courses(db, subject, grade, q)


@router.get("/my")
def my_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "student":
        return course_controller.get_student_courses(current_user.id, db)
    return course_controller.get_facilitator_courses(current_user.id, db)


# Static routes must come before /{course_id} to avoid routing conflicts
@router.get("/invitations")
def get_invitations(db: Session = Depends(get_db),
                    current_user: User = Depends(require_role("student"))):
    return course_controller.get_pending_invitations(current_user.id, db)


@router.post("/join")
def join_course(data: JoinCourseIn, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("student"))):
    return course_controller.join_by_code(data.code, current_user.id, db)


@router.get("/{course_id}")
def course_detail(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return course_controller.get_course_detail(course_id, db, viewer_id=current_user.id)


@router.post("/")
def create_course(data: CourseCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.create_course(data, current_user.id, db)


@router.post("/{course_id}/enroll")
def enroll(course_id: int, db: Session = Depends(get_db),
           current_user: User = Depends(require_role("student"))):
    return course_controller.enroll_student(course_id, current_user.id, db)


@router.post("/{course_id}/modules")
def add_module(course_id: int, data: ModuleCreate, db: Session = Depends(get_db),
               current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.add_module(course_id, data, current_user.id, db)


@router.post("/{course_id}/modules/{module_id}/complete")
def complete_module(course_id: int, module_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(require_role("student"))):
    return course_controller.complete_module(course_id, module_id, current_user.id, db)


@router.post("/{course_id}/add-student")
def add_student(course_id: int, data: InviteCreate, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.enroll_student_by_facilitator(course_id, data.student_id, current_user.id, db)


@router.post("/{course_id}/invite")
def invite_student(course_id: int, data: InviteCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.invite_student(course_id, data.student_id, current_user.id, db)


@router.post("/{course_id}/invite/accept")
def accept_invite(course_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("student"))):
    return course_controller.accept_invitation(course_id, current_user.id, db)
