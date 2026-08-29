from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from api.database import get_db
from api.schemas.course import (
    CourseCreate, CourseUpdate, ModuleCreate, InviteCreate, JoinCourseIn,
    TeamMemberIn, MeetingCreate,
)
from api.controller import course_controller
from api.utils.auth import get_current_user, require_role
from api.utils import r2
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


@router.get("/students-overview")
def students_overview(db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.get_students_overview(current_user.id, db)


@router.get("/progress-analytics")
def progress_analytics(db: Session = Depends(get_db),
                       current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.get_progress_analytics(current_user.id, db)


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


@router.put("/{course_id}")
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.update_course(course_id, data, current_user.id, db)


@router.post("/{course_id}/thumbnail")
async def upload_thumbnail(course_id: int, file: UploadFile = File(...),
                           db: Session = Depends(get_db),
                           current_user: User = Depends(require_role("facilitator", "admin"))):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files accepted")
    file_bytes = await file.read()
    key = r2.upload_file(file_bytes, file.filename, prefix="course-thumbnails")
    return course_controller.set_course_thumbnail(course_id, r2.proxy_url(key), current_user.id, db)


@router.post("/{course_id}/invite/regenerate")
def regenerate_invite(course_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.regenerate_invite_code(course_id, current_user.id, db)


@router.get("/{course_id}/team")
def get_team(course_id: int, db: Session = Depends(get_db),
            current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.list_team_members(course_id, current_user.id, db)


@router.post("/{course_id}/team")
def add_team(course_id: int, data: TeamMemberIn, db: Session = Depends(get_db),
            current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.add_team_member(course_id, data, current_user.id, db)


@router.delete("/{course_id}/team/{member_id}")
def remove_team(course_id: int, member_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.remove_team_member(course_id, member_id, current_user.id, db)


@router.get("/{course_id}/meetings")
def get_meetings(course_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.list_meetings(course_id, current_user.id, db)


@router.post("/{course_id}/meetings")
def add_meeting(course_id: int, data: MeetingCreate, db: Session = Depends(get_db),
                current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.create_meeting(course_id, data, current_user.id, db)


@router.delete("/{course_id}/meetings/{meeting_id}")
def remove_meeting(course_id: int, meeting_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(require_role("facilitator", "admin"))):
    return course_controller.cancel_meeting(course_id, meeting_id, current_user.id, db)
