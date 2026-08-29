import secrets
import string

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
from datetime import datetime, timedelta
from api.model.course import (
    Course, Enrollment, Module, ModuleCompletion, Invitation,
    CourseTeamMember, CourseMeeting,
)
from api.model.notification import Notification
from api.schemas.course import (
    CourseCreate, CourseOut, CourseUpdate, ModuleCreate, ModuleOut,
    TeamMemberIn, TeamMemberOut, MeetingCreate, MeetingOut, StudentOverviewOut,
    ProgressAnalyticsOut,
)

_INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_invite_code(db: Session) -> str:
    """7 chars from a 36-symbol alphabet (36^7 ≈ 78 billion) — collision-checked
    anyway since this app's course count will never be remotely close to that."""
    while True:
        code = "".join(secrets.choice(_INVITE_CODE_ALPHABET) for _ in range(7))
        if not db.query(Course).filter(Course.invite_code == code).first():
            return code


def _generate_course_code(subject: str, course_id: int) -> str:
    subj = "".join(ch for ch in (subject or "GEN").upper() if ch.isalnum())[:4] or "GEN"
    return f"{subj}-{course_id}"


def _to_out(c: Course) -> CourseOut:
    out = CourseOut.model_validate(c)
    if c.facilitator:
        out.facilitator_name = f"{c.facilitator.first_name} {c.facilitator.last_name}"
    out.student_count = len(c.enrollments)
    out.active_assignment_count = sum(1 for a in c.assignments if a.status == "published")
    out.grading_due = any(
        s.grade is None for a in c.assignments for s in a.submissions
    )
    if c.enrollments:
        out.avg_progress_percent = sum(e.progress_percent or 0 for e in c.enrollments) / len(c.enrollments)
    return out


def get_all_courses(db: Session, subject: Optional[str] = None, grade: Optional[str] = None,
                     q_text: Optional[str] = None) -> List[CourseOut]:
    q = db.query(Course).filter(Course.is_approved == True)
    if subject:
        q = q.filter(Course.subject.ilike(f"%{subject}%"))
    if grade:
        q = q.filter(Course.grade_level == grade)
    if q_text:
        like = f"%{q_text}%"
        q = q.filter((Course.title.ilike(like)) | (Course.description.ilike(like)))
    # Never leak invite codes on the general/public catalog — a code is only meant to
    # reach a student through the facilitator sharing it out of band.
    results = []
    for c in q.all():
        out = _to_out(c)
        out.invite_code = None
        results.append(out)
    return results


def get_student_courses(student_id: int, db: Session) -> list:
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    return [{"course": _to_out(e.course), "enrollment": {
        "progress_percent": e.progress_percent,
        "completed": e.completed,
        "pass_status": e.pass_status or "in_progress",
    }} for e in enrollments]


def get_facilitator_courses(facilitator_id: int, db: Session) -> List[CourseOut]:
    courses = db.query(Course).filter(Course.facilitator_id == facilitator_id).all()
    # Backfill invite codes for courses created before this feature existed.
    changed = False
    for c in courses:
        if not c.invite_code:
            c.invite_code = _generate_invite_code(db)
            changed = True
    if changed:
        db.commit()
        for c in courses:
            db.refresh(c)
    return [_to_out(c) for c in courses]


def create_course(data: CourseCreate, creator_id: int, db: Session) -> CourseOut:
    course = Course(
        title=data.title, description=data.description, goals=data.goals, subject=data.subject,
        grade_level=data.grade_level, facilitator_id=creator_id,
        is_public=data.is_public, cover_color=data.cover_color or "#2f6df6",
        level=data.level or "Beginner", duration_hours=data.duration_hours,
        status=data.status or "active", target_grade_percent=data.target_grade_percent or 80,
    )
    db.add(course)
    db.flush()
    course.invite_code = _generate_invite_code(db)
    course.course_code = _generate_course_code(course.subject, course.id)
    db.commit()
    db.refresh(course)
    return _to_out(course)


def update_course(course_id: int, data: CourseUpdate, facilitator_id: int, db: Session) -> CourseOut:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return _to_out(course)


def set_course_thumbnail(course_id: int, thumbnail_path: str, facilitator_id: int, db: Session) -> CourseOut:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    course.thumbnail_path = thumbnail_path
    db.commit()
    db.refresh(course)
    return _to_out(course)


def regenerate_invite_code(course_id: int, facilitator_id: int, db: Session) -> CourseOut:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    course.invite_code = _generate_invite_code(db)
    db.commit()
    db.refresh(course)
    return _to_out(course)


# ---------------------------------------------------------------------------
# Instructor & Team
# ---------------------------------------------------------------------------

def _team_out(m: CourseTeamMember) -> TeamMemberOut:
    out = TeamMemberOut.model_validate(m)
    if m.user:
        out.first_name = m.user.first_name
        out.last_name = m.user.last_name
        out.email = m.user.email
    return out


def list_team_members(course_id: int, facilitator_id: int, db: Session) -> List[TeamMemberOut]:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    return [_team_out(m) for m in course.team_members]


def add_team_member(course_id: int, data: TeamMemberIn, facilitator_id: int, db: Session) -> TeamMemberOut:
    from api.model.user import User
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    user = db.query(User).filter(User.id == data.user_id, User.role.in_(["facilitator", "admin"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    existing = db.query(CourseTeamMember).filter(
        CourseTeamMember.course_id == course_id, CourseTeamMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already on the team")
    member = CourseTeamMember(course_id=course_id, user_id=data.user_id, role=data.role or "ta")
    db.add(member)
    db.commit()
    db.refresh(member)
    return _team_out(member)


def remove_team_member(course_id: int, member_id: int, facilitator_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    member = db.query(CourseTeamMember).filter(
        CourseTeamMember.id == member_id, CourseTeamMember.course_id == course_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    db.delete(member)
    db.commit()
    return {"message": "Removed from team"}


# ---------------------------------------------------------------------------
# 1-on-1 Meetings
# ---------------------------------------------------------------------------

def _meeting_out(m: CourseMeeting) -> MeetingOut:
    out = MeetingOut.model_validate(m)
    if m.student:
        out.student_name = f"{m.student.first_name} {m.student.last_name}"
    return out


def list_meetings(course_id: int, facilitator_id: int, db: Session) -> List[MeetingOut]:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    meetings = db.query(CourseMeeting).filter(
        CourseMeeting.course_id == course_id
    ).order_by(CourseMeeting.scheduled_at).all()
    return [_meeting_out(m) for m in meetings]


def create_meeting(course_id: int, data: MeetingCreate, facilitator_id: int, db: Session) -> MeetingOut:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    if data.student_id and not db.query(Enrollment).filter(
        Enrollment.course_id == course_id, Enrollment.student_id == data.student_id
    ).first():
        raise HTTPException(status_code=400, detail="Student is not enrolled in this course")
    meeting = CourseMeeting(
        course_id=course_id, facilitator_id=facilitator_id, student_id=data.student_id,
        scheduled_at=data.scheduled_at, duration_minutes=data.duration_minutes, notes=data.notes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _meeting_out(meeting)


def cancel_meeting(course_id: int, meeting_id: int, facilitator_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    meeting = db.query(CourseMeeting).filter(
        CourseMeeting.id == meeting_id, CourseMeeting.course_id == course_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting.status = "cancelled"
    db.commit()
    return {"message": "Meeting cancelled"}


# ---------------------------------------------------------------------------
# Students overview (aggregate, backs Students page / Progress table / Messages panel)
# ---------------------------------------------------------------------------

def get_students_overview(facilitator_id: int, db: Session) -> List[StudentOverviewOut]:
    from api.model.assignment import Submission, Assignment
    from api.model.user import User

    courses = db.query(Course).filter(Course.facilitator_id == facilitator_id).all()
    course_ids = [c.id for c in courses]
    if not course_ids:
        return []

    enrollments = db.query(Enrollment).filter(Enrollment.course_id.in_(course_ids)).all()
    by_student: dict = {}
    for e in enrollments:
        by_student.setdefault(e.student_id, {"courses": [], "at_risk": False})
        course = next((c for c in courses if c.id == e.course_id), None)
        if course:
            by_student[e.student_id]["courses"].append({
                "course_id": course.id, "title": course.title,
                "progress_percent": e.progress_percent, "pass_status": e.pass_status,
            })
        if e.pass_status == "retake":
            by_student[e.student_id]["at_risk"] = True

    assignments = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
    assignment_ids = [a.id for a in assignments]
    assignments_by_id = {a.id: a for a in assignments}

    def _pct(sub) -> Optional[float]:
        a = assignments_by_id.get(sub.assignment_id)
        return (sub.grade / a.max_score * 100) if a and a.max_score else None

    def _avg_pct(subs) -> Optional[float]:
        vals = [p for p in (_pct(s) for s in subs) if p is not None]
        return sum(vals) / len(vals) if vals else None

    results = []
    for student_id, info in by_student.items():
        student = db.query(User).filter(User.id == student_id).first()
        if not student:
            continue
        subs = db.query(Submission).filter(
            Submission.student_id == student_id,
            Submission.assignment_id.in_(assignment_ids),
        ).order_by(Submission.submitted_at).all() if assignment_ids else []
        graded = [s for s in subs if s.grade is not None]
        avg_grade = _avg_pct(graded)

        trend = "flat"
        if len(graded) >= 2:
            recent = graded[-3:]
            prior = graded[:-3][-3:] if len(graded) > 3 else []
            if prior:
                r_avg, p_avg = _avg_pct(recent), _avg_pct(prior)
                if r_avg is not None and p_avg is not None:
                    trend = "up" if r_avg > p_avg + 1 else ("down" if r_avg < p_avg - 1 else "flat")

        timestamps = [s.graded_at or s.submitted_at for s in subs if (s.graded_at or s.submitted_at)]
        last_activity = max(timestamps) if timestamps else None

        recent_activity = [
            {
                "type": "submission",
                "title": f"Submitted {assignments_by_id[s.assignment_id].title}" if assignments_by_id.get(s.assignment_id) else "Submitted an assignment",
                "course_title": next((c["title"] for c in info["courses"] if c["course_id"] == assignments_by_id[s.assignment_id].course_id), "") if assignments_by_id.get(s.assignment_id) else "",
                "at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in sorted(subs, key=lambda s: s.submitted_at or datetime.min, reverse=True)[:3]
            if s.submitted_at
        ]

        results.append(StudentOverviewOut(
            student_id=student.id, first_name=student.first_name, last_name=student.last_name,
            email=student.email, courses=info["courses"], avg_grade_percent=avg_grade,
            trend=trend, last_activity=last_activity, at_risk=info["at_risk"],
            recent_activity=recent_activity,
        ))
    return results


def join_by_code(code: str, student_id: int, db: Session) -> dict:
    code = (code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Enter an invite code")
    course = db.query(Course).filter(Course.invite_code == code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course.id).first():
        raise HTTPException(status_code=400, detail="You're already enrolled in this course")
    db.add(Enrollment(student_id=student_id, course_id=course.id))
    db.add(Notification(user_id=student_id, title="Joined Course",
                        message=f"You joined '{course.title}' using an invite code.", type="course"))
    db.commit()
    return {"message": "Joined successfully", "course_id": course.id, "course_title": course.title}


def enroll_student(course_id: int, student_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id).first():
        raise HTTPException(status_code=400, detail="Already enrolled")
    if not course.is_public:
        raise HTTPException(status_code=403, detail="This course is private — enrollment is by invitation only")
    db.add(Enrollment(student_id=student_id, course_id=course_id))
    db.add(Notification(user_id=student_id, title="Enrolled in Course",
                        message=f"You have been enrolled in '{course.title}'.", type="course"))
    db.commit()
    return {"message": "Enrolled successfully"}


def enroll_student_by_facilitator(course_id: int, student_id: int, facilitator_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    if db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id).first():
        raise HTTPException(status_code=400, detail="Student already enrolled")
    db.add(Enrollment(student_id=student_id, course_id=course_id))
    db.add(Notification(
        user_id=student_id, title="Enrolled in Course",
        message=f"Your teacher has added you to '{course.title}'.", type="course",
    ))
    db.commit()
    return {"message": "Student enrolled successfully"}


def invite_student(course_id: int, student_id: int, inviter_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == inviter_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    if db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id).first():
        raise HTTPException(status_code=400, detail="Student already enrolled")
    existing = db.query(Invitation).filter(
        Invitation.course_id == course_id,
        Invitation.student_id == student_id,
        Invitation.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invitation already sent")
    db.add(Invitation(course_id=course_id, student_id=student_id, invited_by=inviter_id))
    db.add(Notification(
        user_id=student_id, title="Course Invitation",
        message=f"You have been invited to join '{course.title}'. Go to My Courses → Invitations to accept.",
        type="invite",
    ))
    db.commit()
    return {"message": "Invitation sent"}


def accept_invitation(course_id: int, student_id: int, db: Session) -> dict:
    inv = db.query(Invitation).filter(
        Invitation.course_id == course_id,
        Invitation.student_id == student_id,
        Invitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="No pending invitation found")
    inv.status = "accepted"
    if db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id).first():
        db.commit()
        return {"message": "Already enrolled"}
    db.add(Enrollment(student_id=student_id, course_id=course_id))
    db.add(Notification(user_id=student_id, title="Enrolled in Course",
                        message=f"You have been enrolled in '{inv.course.title}'.", type="course"))
    db.commit()
    return {"message": "Invitation accepted — you are now enrolled"}


def get_pending_invitations(student_id: int, db: Session) -> list:
    invs = db.query(Invitation).filter(
        Invitation.student_id == student_id, Invitation.status == "pending"
    ).all()
    return [{"id": i.id, "course_id": i.course_id, "course_title": i.course.title,
             "inviter": f"{i.inviter.first_name} {i.inviter.last_name}",
             "created_at": i.created_at.isoformat() if i.created_at else None} for i in invs]


def recalculate_pass_status(student_id: int, course_id: int, db: Session):
    from api.model.assignment import Assignment, Submission
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student_id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        return
    assignments = db.query(Assignment).filter(
        Assignment.course_id == course_id, Assignment.is_published == True
    ).all()
    if not assignments:
        return
    total_max = sum(a.max_score for a in assignments)
    if total_max == 0:
        return
    graded = db.query(Submission).filter(
        Submission.student_id == student_id,
        Submission.assignment_id.in_([a.id for a in assignments]),
        Submission.grade != None,
    ).all()
    total_grade = sum(s.grade for s in graded)
    progress = int(len(graded) / len(assignments) * 100)
    enrollment.progress_percent = progress
    percentage = (total_grade / total_max) * 100
    if percentage >= 55:
        enrollment.pass_status = "passed"
        enrollment.completed = True
    else:
        enrollment.pass_status = "retake" if len(graded) == len(assignments) else "in_progress"
        enrollment.completed = False
    db.commit()


def get_course_detail(course_id: int, db: Session, viewer_id: int = None) -> dict:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    # Flat response: course fields + modules + enrollments (for facilitator student view)
    out = _to_out(course).model_dump()
    out["modules"] = [ModuleOut.model_validate(m).model_dump() for m in course.modules]
    if viewer_id is not None:
        completed_ids = {
            mc.module_id for mc in db.query(ModuleCompletion).filter(
                ModuleCompletion.student_id == viewer_id,
                ModuleCompletion.module_id.in_([m.id for m in course.modules]),
            ).all()
        }
        for m_out in out["modules"]:
            m_out["completed"] = m_out["id"] in completed_ids
    out["enrollments"] = [
        {
            "id": e.id,
            "student_id": e.student_id,
            "progress_percent": e.progress_percent,
            "completed": e.completed,
            "pass_status": e.pass_status or "in_progress",
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "student": {
                "id": e.student.id,
                "first_name": e.student.first_name,
                "last_name": e.student.last_name,
                "email": e.student.email,
                "grade": getattr(e.student, "grade", None),
                "school": getattr(e.student, "school", None),
            } if e.student else None,
        }
        for e in course.enrollments
    ]
    return out


def add_module(course_id: int, data: ModuleCreate, facilitator_id: int, db: Session) -> ModuleOut:
    course = db.query(Course).filter(Course.id == course_id, Course.facilitator_id == facilitator_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
    m = Module(course_id=course_id, title=data.title, content=data.content, order_num=data.order_num)
    db.add(m)
    db.commit()
    db.refresh(m)
    return ModuleOut.model_validate(m)


def complete_module(course_id: int, module_id: int, student_id: int, db: Session) -> dict:
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student_id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    already = db.query(ModuleCompletion).filter(
        ModuleCompletion.student_id == student_id,
        ModuleCompletion.module_id == module_id,
    ).first()
    if not already:
        db.add(ModuleCompletion(student_id=student_id, module_id=module_id))

    # Recalculate progress
    course = db.query(Course).filter(Course.id == course_id).first()
    total = len(course.modules)
    if total > 0:
        module_ids = [m.id for m in course.modules]
        done = db.query(ModuleCompletion).filter(
            ModuleCompletion.student_id == student_id,
            ModuleCompletion.module_id.in_(module_ids),
        ).count()
        # count the one we just added if new
        if not already:
            done = min(done + 1, total)
        enrollment.progress_percent = int((done / total) * 100)

    db.commit()
    return {"progress_percent": enrollment.progress_percent, "message": "Module marked as complete"}


# ---------------------------------------------------------------------------
# Progress & Analytics
# ---------------------------------------------------------------------------

def get_progress_analytics(facilitator_id: int, db: Session) -> ProgressAnalyticsOut:
    from api.model.assignment import Assignment, Submission

    courses = db.query(Course).filter(Course.facilitator_id == facilitator_id).all()
    if not courses:
        return ProgressAnalyticsOut()
    course_ids = [c.id for c in courses]

    assignments = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
    published = [a for a in assignments if a.status == "published"]
    assignment_ids = [a.id for a in assignments]
    assignments_by_id = {a.id: a for a in assignments}

    subs = db.query(Submission).filter(Submission.assignment_id.in_(assignment_ids)).all() if assignment_ids else []
    graded = [s for s in subs if s.grade is not None]

    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=30)
    prior_cutoff = now - timedelta(days=60)

    def _pct(sub) -> Optional[float]:
        a = assignments_by_id.get(sub.assignment_id)
        return (sub.grade / a.max_score * 100) if a and a.max_score else None

    def _avg_pct(items) -> Optional[float]:
        vals = [p for p in (_pct(s) for s in items) if p is not None]
        return sum(vals) / len(vals) if vals else None

    avg_class_grade_percent = _avg_pct(graded)
    recent_graded = [s for s in graded if s.graded_at and s.graded_at >= recent_cutoff]
    prior_graded = [s for s in graded if s.graded_at and prior_cutoff <= s.graded_at < recent_cutoff]
    r_avg, p_avg = _avg_pct(recent_graded), _avg_pct(prior_graded)
    avg_class_grade_trend = (r_avg - p_avg) if (r_avg is not None and p_avg is not None) else None

    enrollment_counts = {c.id: len(c.enrollments) for c in courses}
    expected = sum(len([a for a in published if a.course_id == c.id]) * enrollment_counts.get(c.id, 0) for c in courses)
    assignment_completion_percent = (len(subs) / expected * 100) if expected else None

    at_risk_students = set()
    for c in courses:
        for e in c.enrollments:
            if e.pass_status == "retake":
                at_risk_students.add(e.student_id)

    def _hours(sub) -> Optional[float]:
        if sub.graded_at and sub.submitted_at:
            return (sub.graded_at - sub.submitted_at).total_seconds() / 3600
        return None

    def _avg_hours(items) -> Optional[float]:
        vals = [h for h in (_hours(s) for s in items) if h is not None]
        return sum(vals) / len(vals) if vals else None

    avg_grading_time_hours = _avg_hours(graded)
    r_hours, p_hours = _avg_hours(recent_graded), _avg_hours(prior_graded)
    avg_grading_time_trend = (r_hours - p_hours) if (r_hours is not None and p_hours is not None) else None

    target_grade_percent = round(sum(c.target_grade_percent or 80 for c in courses) / len(courses))

    weekly = {}
    for s in graded:
        if not s.graded_at:
            continue
        pct = _pct(s)
        if pct is None:
            continue
        week_start = (s.graded_at - timedelta(days=s.graded_at.weekday())).date()
        weekly.setdefault(week_start, []).append(pct)
    weekly_series = [
        {"week_start": wk.isoformat(), "avg_grade_percent": sum(v) / len(v)}
        for wk, v in sorted(weekly.items())
    ]

    subject_performance = []
    for c in courses:
        c_subs = [s for s in graded if assignments_by_id.get(s.assignment_id) and assignments_by_id[s.assignment_id].course_id == c.id]
        subject_performance.append({
            "course_id": c.id, "title": c.title,
            "avg_grade_percent": _avg_pct(c_subs),
            "target_grade_percent": c.target_grade_percent or 80,
        })

    return ProgressAnalyticsOut(
        avg_class_grade_percent=avg_class_grade_percent,
        avg_class_grade_trend=avg_class_grade_trend,
        assignment_completion_percent=assignment_completion_percent,
        assignment_completion_trend=None,
        at_risk_count=len(at_risk_students),
        avg_grading_time_hours=avg_grading_time_hours,
        avg_grading_time_trend=avg_grading_time_trend,
        target_grade_percent=target_grade_percent,
        weekly_series=weekly_series,
        subject_performance=subject_performance,
    )
