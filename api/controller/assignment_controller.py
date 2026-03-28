import os
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from typing import List
from api.model.assignment import Assignment, Submission
from api.model.course import Enrollment
from api.model.notification import Notification
from api.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionCreate, SubmissionOut, GradeSubmission,
)


def _aout(a: Assignment, student_id: int = None, db: Session = None) -> AssignmentOut:
    out = AssignmentOut.model_validate(a)
    if a.course:
        out.course_title = a.course.title
    if student_id and db:
        sub = db.query(Submission).filter(
            Submission.assignment_id == a.id,
            Submission.student_id == student_id,
        ).first()
        if sub:
            out.student_grade = sub.grade
            out.student_feedback = sub.feedback
            out.student_submission_id = sub.id
            out.student_submission_type = sub.submission_type
            out.student_content = sub.content
            out.student_file_path = sub.file_path
    return out


def create_assignment(data: AssignmentCreate, creator_id: int, db: Session,
                      attachment_path: str = None) -> AssignmentOut:
    a = Assignment(
        title=data.title, description=data.description, course_id=data.course_id,
        created_by=creator_id, due_date=data.due_date,
        type=data.type or data.assignment_type,
        max_score=data.max_score, is_published=data.is_published,
        attachment_url=data.attachment_url,
        attachment_path=attachment_path,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    if data.is_published and data.course_id:
        for e in db.query(Enrollment).filter(Enrollment.course_id == data.course_id).all():
            db.add(Notification(
                user_id=e.student_id, title="New Assignment",
                message=f"New {a.type}: '{a.title}' has been published.", type="assignment",
            ))
        db.commit()
    return _aout(a)


def update_assignment(assignment_id: int, data: AssignmentUpdate, facilitator_id: int, db: Session,
                      attachment_path: str = None) -> AssignmentOut:
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.created_by == facilitator_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")
    if data.title is not None:           a.title = data.title
    if data.description is not None:     a.description = data.description
    if data.due_date is not None:        a.due_date = data.due_date
    if data.assignment_type is not None: a.type = data.assignment_type
    if data.max_score is not None:       a.max_score = data.max_score
    if data.attachment_url is not None:  a.attachment_url = data.attachment_url
    if attachment_path is not None:      a.attachment_path = attachment_path
    if data.is_published is not None:
        was = a.is_published
        a.is_published = data.is_published
        if data.is_published and not was and a.course_id:
            for e in db.query(Enrollment).filter(Enrollment.course_id == a.course_id).all():
                db.add(Notification(user_id=e.student_id, title="Assignment Published",
                    message=f"'{a.title}' is now available.", type="assignment"))
    db.commit()
    db.refresh(a)
    return _aout(a)


def get_assignments_student(student_id: int, db: Session) -> dict:
    course_ids = [e.course_id for e in db.query(Enrollment).filter(Enrollment.student_id == student_id).all()]
    all_a = db.query(Assignment).filter(
        Assignment.course_id.in_(course_ids), Assignment.is_published == True
    ).order_by(Assignment.due_date).all()
    submitted_ids = {s.assignment_id for s in db.query(Submission).filter(Submission.student_id == student_id).all()}
    upcoming, submitted = [], []
    for a in all_a:
        out = _aout(a, student_id, db)
        if a.id in submitted_ids:
            submitted.append(out)
        else:
            upcoming.append(out)
    return {"upcoming": upcoming, "submitted": submitted}


def get_assignments_facilitator(facilitator_id: int, db: Session) -> List[AssignmentOut]:
    return [_aout(a) for a in db.query(Assignment).filter(Assignment.created_by == facilitator_id).all()]


def submit_assignment(assignment_id: int, student_id: int, data: SubmissionCreate, db: Session) -> SubmissionOut:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if db.query(Submission).filter(Submission.assignment_id == assignment_id, Submission.student_id == student_id).first():
        raise HTTPException(status_code=400, detail="Already submitted")
    s = Submission(assignment_id=assignment_id, student_id=student_id,
                   submission_type=data.submission_type, content=data.content)
    db.add(s)
    if a.created_by:
        db.add(Notification(user_id=a.created_by, title="New Submission",
            message=f"A student submitted '{a.title}'.", type="assignment"))
    db.commit()
    db.refresh(s)
    out = SubmissionOut.model_validate(s)
    out.assignment_title = a.title
    return out


def submit_file(assignment_id: int, student_id: int, file_path: str, db: Session) -> SubmissionOut:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if db.query(Submission).filter(Submission.assignment_id == assignment_id, Submission.student_id == student_id).first():
        raise HTTPException(status_code=400, detail="Already submitted")
    s = Submission(assignment_id=assignment_id, student_id=student_id, submission_type="pdf", file_path=file_path)
    db.add(s)
    if a.created_by:
        db.add(Notification(user_id=a.created_by, title="New PDF Submission",
            message=f"A student submitted a PDF for '{a.title}'.", type="assignment"))
    db.commit()
    db.refresh(s)
    out = SubmissionOut.model_validate(s)
    out.assignment_title = a.title
    return out


def grade_submission(submission_id: int, data: GradeSubmission, db: Session) -> SubmissionOut:
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    s.grade = data.grade
    s.feedback = data.feedback
    s.graded_at = datetime.utcnow()
    db.add(Notification(user_id=s.student_id, title="Assignment Graded",
        message=f"Your assignment '{s.assignment.title}' scored {data.grade}/{s.assignment.max_score}. {data.feedback or ''}".strip(),
        type="assignment"))
    db.commit()
    db.refresh(s)
    # Recalculate course pass status after grading
    if s.assignment.course_id:
        from api.controller.course_controller import recalculate_pass_status
        recalculate_pass_status(s.student_id, s.assignment.course_id, db)
    out = SubmissionOut.model_validate(s)
    if s.student:
        out.student_name = f"{s.student.first_name} {s.student.last_name}"
    return out


def get_submissions(assignment_id: int, db: Session) -> List[SubmissionOut]:
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    result = []
    for s in subs:
        out = SubmissionOut.model_validate(s)
        if s.student:
            out.student_name = f"{s.student.first_name} {s.student.last_name}"
        if s.assignment:
            out.assignment_title = s.assignment.title
        result.append(out)
    return result
