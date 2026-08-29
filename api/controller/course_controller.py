import secrets
import string

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
from api.model.course import Course, Enrollment, Module, ModuleCompletion, Invitation
from api.model.notification import Notification
from api.schemas.course import CourseCreate, CourseOut, ModuleCreate, ModuleOut

_INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_invite_code(db: Session) -> str:
    """7 chars from a 36-symbol alphabet (36^7 ≈ 78 billion) — collision-checked
    anyway since this app's course count will never be remotely close to that."""
    while True:
        code = "".join(secrets.choice(_INVITE_CODE_ALPHABET) for _ in range(7))
        if not db.query(Course).filter(Course.invite_code == code).first():
            return code


def _to_out(c: Course) -> CourseOut:
    out = CourseOut.model_validate(c)
    if c.facilitator:
        out.facilitator_name = f"{c.facilitator.first_name} {c.facilitator.last_name}"
    out.student_count = len(c.enrollments)
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
    )
    db.add(course)
    db.flush()
    course.invite_code = _generate_invite_code(db)
    db.commit()
    db.refresh(course)
    return _to_out(course)


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
