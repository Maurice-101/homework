from fastapi import HTTPException
from sqlalchemy.orm import Session
from api.model.course_content import Announcement, Discussion, DiscussionReply, SyllabusWeek, CourseGroup, GroupMember
from api.model.course import Course, Enrollment
from api.schemas.course_content import (
    AnnouncementCreate, AnnouncementOut,
    DiscussionCreate, DiscussionOut, ReplyCreate, ReplyOut,
    SyllabusWeekCreate, SyllabusWeekOut,
    GroupCreate, GroupMemberAdd, GroupOut, GroupMemberOut,
)


def _name(user) -> str:
    if not user:
        return "Unknown"
    return f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email


def _assert_enrolled_or_facilitator(course_id: int, user_id: int, db: Session):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.facilitator_id == user_id:
        return course
    enr = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.student_id == user_id,
    ).first()
    if not enr:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    return course


def _assert_facilitator(course_id: int, user_id: int, db: Session):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.facilitator_id != user_id:
        raise HTTPException(status_code=403, detail="Only the facilitator can do this")
    return course


# ── Announcements ────────────────────────────────────────────────────────────
def list_announcements(course_id: int, user_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, user_id, db)
    rows = (db.query(Announcement)
            .filter(Announcement.course_id == course_id)
            .order_by(Announcement.created_at.desc())
            .all())
    return [
        AnnouncementOut(
            id=r.id, course_id=r.course_id, title=r.title, content=r.content,
            author_id=r.author_id, author_name=_name(r.author),
            created_at=r.created_at,
        )
        for r in rows
    ]


def create_announcement(course_id: int, data: AnnouncementCreate, author_id: int, db: Session):
    _assert_facilitator(course_id, author_id, db)
    ann = Announcement(course_id=course_id, title=data.title,
                       content=data.content, author_id=author_id)
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return AnnouncementOut(
        id=ann.id, course_id=ann.course_id, title=ann.title, content=ann.content,
        author_id=ann.author_id, author_name=_name(ann.author),
        created_at=ann.created_at,
    )


def delete_announcement(course_id: int, ann_id: int, user_id: int, db: Session):
    _assert_facilitator(course_id, user_id, db)
    ann = db.query(Announcement).filter(
        Announcement.id == ann_id, Announcement.course_id == course_id
    ).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"message": "Deleted"}


# ── Discussions ──────────────────────────────────────────────────────────────
def _disc_out(d: Discussion) -> DiscussionOut:
    return DiscussionOut(
        id=d.id, course_id=d.course_id, title=d.title, body=d.body,
        author_id=d.author_id, author_name=_name(d.author),
        created_at=d.created_at,
        replies=[
            ReplyOut(
                id=r.id, discussion_id=r.discussion_id, body=r.body,
                author_id=r.author_id, author_name=_name(r.author),
                created_at=r.created_at,
            )
            for r in d.replies
        ],
    )


def list_discussions(course_id: int, user_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, user_id, db)
    rows = (db.query(Discussion)
            .filter(Discussion.course_id == course_id)
            .order_by(Discussion.created_at.desc())
            .all())
    return [_disc_out(d) for d in rows]


def create_discussion(course_id: int, data: DiscussionCreate, author_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, author_id, db)
    disc = Discussion(course_id=course_id, title=data.title,
                      body=data.body, author_id=author_id)
    db.add(disc)
    db.commit()
    db.refresh(disc)
    return _disc_out(disc)


def add_reply(course_id: int, disc_id: int, data: ReplyCreate, author_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, author_id, db)
    disc = db.query(Discussion).filter(
        Discussion.id == disc_id, Discussion.course_id == course_id
    ).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")
    reply = DiscussionReply(discussion_id=disc_id, body=data.body, author_id=author_id)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return ReplyOut(
        id=reply.id, discussion_id=reply.discussion_id, body=reply.body,
        author_id=reply.author_id, author_name=_name(reply.author),
        created_at=reply.created_at,
    )


# ── Syllabus ─────────────────────────────────────────────────────────────────
def list_syllabus(course_id: int, user_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, user_id, db)
    rows = (db.query(SyllabusWeek)
            .filter(SyllabusWeek.course_id == course_id)
            .order_by(SyllabusWeek.week_num)
            .all())
    return [SyllabusWeekOut.model_validate(r) for r in rows]


def create_syllabus_week(course_id: int, data: SyllabusWeekCreate, author_id: int, db: Session):
    _assert_facilitator(course_id, author_id, db)
    week = SyllabusWeek(course_id=course_id, week_num=data.week_num,
                        title=data.title, description=data.description,
                        topics=data.topics)
    db.add(week)
    db.commit()
    db.refresh(week)
    return SyllabusWeekOut.model_validate(week)


def update_syllabus_week(course_id: int, week_id: int, data: SyllabusWeekCreate,
                          author_id: int, db: Session):
    _assert_facilitator(course_id, author_id, db)
    week = db.query(SyllabusWeek).filter(
        SyllabusWeek.id == week_id, SyllabusWeek.course_id == course_id
    ).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    week.week_num    = data.week_num
    week.title       = data.title
    week.description = data.description
    week.topics      = data.topics
    db.commit()
    db.refresh(week)
    return SyllabusWeekOut.model_validate(week)


def delete_syllabus_week(course_id: int, week_id: int, author_id: int, db: Session):
    _assert_facilitator(course_id, author_id, db)
    week = db.query(SyllabusWeek).filter(
        SyllabusWeek.id == week_id, SyllabusWeek.course_id == course_id
    ).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    db.delete(week)
    db.commit()
    return {"message": "Deleted"}


# ── Groups ───────────────────────────────────────────────────────────────────
def _group_out(g: CourseGroup) -> GroupOut:
    return GroupOut(
        id=g.id, course_id=g.course_id, name=g.name,
        description=g.description, created_at=g.created_at,
        members=[
            GroupMemberOut(
                id=m.id, student_id=m.student_id,
                student_name=_name(m.student), added_at=m.added_at,
            )
            for m in g.members
        ],
    )


def list_groups(course_id: int, user_id: int, db: Session):
    _assert_enrolled_or_facilitator(course_id, user_id, db)
    rows = db.query(CourseGroup).filter(CourseGroup.course_id == course_id).all()
    return [_group_out(g) for g in rows]


def create_group(course_id: int, data: GroupCreate, user_id: int, db: Session):
    _assert_facilitator(course_id, user_id, db)
    g = CourseGroup(course_id=course_id, name=data.name, description=data.description)
    db.add(g)
    db.commit()
    db.refresh(g)
    return _group_out(g)


def delete_group(course_id: int, group_id: int, user_id: int, db: Session):
    _assert_facilitator(course_id, user_id, db)
    g = db.query(CourseGroup).filter(
        CourseGroup.id == group_id, CourseGroup.course_id == course_id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(g)
    db.commit()
    return {"message": "Deleted"}


def add_group_member(course_id: int, group_id: int, data: GroupMemberAdd,
                     user_id: int, db: Session):
    _assert_facilitator(course_id, user_id, db)
    g = db.query(CourseGroup).filter(
        CourseGroup.id == group_id, CourseGroup.course_id == course_id
    ).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.student_id == data.student_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in group")
    m = GroupMember(group_id=group_id, student_id=data.student_id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return GroupMemberOut(
        id=m.id, student_id=m.student_id,
        student_name=_name(m.student), added_at=m.added_at,
    )


def remove_group_member(course_id: int, group_id: int, student_id: int,
                         user_id: int, db: Session):
    _assert_facilitator(course_id, user_id, db)
    m = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.student_id == student_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"message": "Removed"}
