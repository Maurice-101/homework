from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
from api.model.user import User
from api.model.course import Course, Enrollment
from api.model.assignment import Assignment, Submission
from api.model.notification import Notification
from api.schemas.user import UserOut, UserUpdate


def platform_stats(db: Session) -> dict:
    return {
        "total_students": db.query(User).filter(User.role == "student").count(),
        "total_facilitators": db.query(User).filter(User.role == "facilitator").count(),
        "total_admins": db.query(User).filter(User.role == "admin").count(),
        "total_courses": db.query(Course).count(),
        "total_enrollments": db.query(Enrollment).count(),
        "total_assignments": db.query(Assignment).count(),
        "total_submissions": db.query(Submission).count(),
    }


def list_users(role: Optional[str], db: Session) -> List[UserOut]:
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return [UserOut.model_validate(u) for u in q.all()]


def update_user(user_id: int, data: UserUpdate, db: Session) -> UserOut:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def toggle_user(user_id: int, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


def approve_course(course_id: int, db: Session) -> dict:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.is_approved = True
    if course.facilitator_id:
        db.add(Notification(user_id=course.facilitator_id, title="Course Approved",
                            message=f"Your course '{course.title}' has been approved.", type="course"))
    db.commit()
    return {"message": "Course approved"}


def all_courses(db: Session) -> list:
    return [{
        "id": c.id, "title": c.title, "subject": c.subject, "grade_level": c.grade_level,
        "is_public": c.is_public, "is_approved": c.is_approved,
        "student_count": len(c.enrollments),
        "facilitator": f"{c.facilitator.first_name} {c.facilitator.last_name}" if c.facilitator else "N/A",
        "created_at": c.created_at.isoformat(),
    } for c in db.query(Course).all()]
