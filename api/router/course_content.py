from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database import get_db
from api.controller import course_content_controller as ctrl
from api.schemas.course_content import (
    AnnouncementCreate, AnnouncementCommentCreate, DiscussionCreate, ReplyCreate, SyllabusWeekCreate,
    GroupCreate, GroupMemberAdd,
)
from api.utils.auth import get_current_user
from api.model.user import User

router = APIRouter(tags=["Course Content"])


# ── Announcements ─────────────────────────────────────────────────────────────
@router.get("/courses/{course_id}/announcements")
def list_announcements(course_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    return ctrl.list_announcements(course_id, current_user.id, db)


@router.post("/courses/{course_id}/announcements")
def create_announcement(course_id: int, data: AnnouncementCreate,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    return ctrl.create_announcement(course_id, data, current_user.id, db)


@router.delete("/courses/{course_id}/announcements/{ann_id}")
def delete_announcement(course_id: int, ann_id: int,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    return ctrl.delete_announcement(course_id, ann_id, current_user.id, db)


@router.post("/courses/{course_id}/announcements/{ann_id}/comments")
def add_announcement_comment(course_id: int, ann_id: int, data: AnnouncementCommentCreate,
                              db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    return ctrl.add_announcement_comment(course_id, ann_id, data, current_user.id, db)


# ── Discussions ───────────────────────────────────────────────────────────────
@router.get("/courses/{course_id}/discussions")
def list_discussions(course_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    return ctrl.list_discussions(course_id, current_user.id, db)


@router.post("/courses/{course_id}/discussions")
def create_discussion(course_id: int, data: DiscussionCreate,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    return ctrl.create_discussion(course_id, data, current_user.id, db)


@router.post("/courses/{course_id}/discussions/{disc_id}/replies")
def add_reply(course_id: int, disc_id: int, data: ReplyCreate,
              db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    return ctrl.add_reply(course_id, disc_id, data, current_user.id, db)


# ── Syllabus ──────────────────────────────────────────────────────────────────
@router.get("/courses/{course_id}/syllabus")
def list_syllabus(course_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    return ctrl.list_syllabus(course_id, current_user.id, db)


@router.post("/courses/{course_id}/syllabus")
def create_syllabus_week(course_id: int, data: SyllabusWeekCreate,
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    return ctrl.create_syllabus_week(course_id, data, current_user.id, db)


@router.put("/courses/{course_id}/syllabus/{week_id}")
def update_syllabus_week(course_id: int, week_id: int, data: SyllabusWeekCreate,
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    return ctrl.update_syllabus_week(course_id, week_id, data, current_user.id, db)


@router.delete("/courses/{course_id}/syllabus/{week_id}")
def delete_syllabus_week(course_id: int, week_id: int,
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    return ctrl.delete_syllabus_week(course_id, week_id, current_user.id, db)


# ── Groups ────────────────────────────────────────────────────────────────────
@router.get("/courses/{course_id}/groups")
def list_groups(course_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    return ctrl.list_groups(course_id, current_user.id, db)


@router.post("/courses/{course_id}/groups")
def create_group(course_id: int, data: GroupCreate,
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return ctrl.create_group(course_id, data, current_user.id, db)


@router.delete("/courses/{course_id}/groups/{group_id}")
def delete_group(course_id: int, group_id: int,
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    return ctrl.delete_group(course_id, group_id, current_user.id, db)


@router.post("/courses/{course_id}/groups/{group_id}/members")
def add_group_member(course_id: int, group_id: int, data: GroupMemberAdd,
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    return ctrl.add_group_member(course_id, group_id, data, current_user.id, db)


@router.delete("/courses/{course_id}/groups/{group_id}/members/{student_id}")
def remove_group_member(course_id: int, group_id: int, student_id: int,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    return ctrl.remove_group_member(course_id, group_id, student_id, current_user.id, db)
