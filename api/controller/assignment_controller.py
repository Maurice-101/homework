import os
import random
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from typing import List, Optional
from api.model.assignment import (
    Assignment, Submission, AssignmentAttachment,
    AssignmentQuestion, QuestionOption, QuestionResponse, AUTO_GRADED_TYPES,
)
from api.model.course import Enrollment
from api.model.notification import Notification
from api.settings import settings
from api.schemas.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentOut,
    SubmissionCreate, SubmissionOut, GradeSubmission,
    QuestionsSetIn, AnswersSubmitIn, GradeAnswer,
)


def _aout(a: Assignment, student_id: int = None, db: Session = None) -> AssignmentOut:
    out = AssignmentOut.model_validate(a)
    out.question_count = len(a.questions)
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
                      attachment_path: str = None, attachment_files: list = None) -> AssignmentOut:
    status = data.status or ("published" if data.is_published else "draft")
    a = Assignment(
        title=data.title, description=data.description, course_id=data.course_id,
        created_by=creator_id, due_date=data.due_date,
        type=data.type or data.assignment_type,
        max_score=data.max_score, is_published=(status != "draft"),
        attachment_url=data.attachment_url,
        attachment_path=attachment_path,
        status=status, available_from=data.available_from,
        time_limit_minutes=data.time_limit_minutes, max_attempts=data.max_attempts,
        randomize_questions=data.randomize_questions, randomize_choices=data.randomize_choices,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    for file_path, filename in (attachment_files or []):
        db.add(AssignmentAttachment(assignment_id=a.id, file_path=file_path, filename=filename))
    if attachment_files:
        db.commit()
        db.refresh(a)
    if status == "published" and data.course_id:
        for e in db.query(Enrollment).filter(Enrollment.course_id == data.course_id).all():
            db.add(Notification(
                user_id=e.student_id, title="New Assignment",
                message=f"New {a.type}: '{a.title}' has been published.", type="assignment",
            ))
        db.commit()
    return _aout(a)


def update_assignment(assignment_id: int, data: AssignmentUpdate, facilitator_id: int, db: Session,
                      attachment_path: str = None, attachment_files: list = None) -> AssignmentOut:
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.created_by == facilitator_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")
    if data.title is not None:           a.title = data.title
    if data.description is not None:     a.description = data.description
    if data.due_date is not None:        a.due_date = data.due_date
    if data.assignment_type is not None: a.type = data.assignment_type
    if data.max_score is not None:       a.max_score = data.max_score
    if data.attachment_url is not None:  a.attachment_url = data.attachment_url
    if data.available_from is not None:      a.available_from = data.available_from
    if data.time_limit_minutes is not None:  a.time_limit_minutes = data.time_limit_minutes
    if data.max_attempts is not None:        a.max_attempts = data.max_attempts
    if data.randomize_questions is not None: a.randomize_questions = data.randomize_questions
    if data.randomize_choices is not None:   a.randomize_choices = data.randomize_choices
    if attachment_path is not None:      a.attachment_path = attachment_path
    for file_path, filename in (attachment_files or []):
        db.add(AssignmentAttachment(assignment_id=a.id, file_path=file_path, filename=filename))

    new_status = data.status
    if new_status is None and data.is_published is not None:
        new_status = "published" if data.is_published else "draft"
    if new_status is not None:
        was_published = a.status == "published"
        a.status = new_status
        a.is_published = (new_status != "draft")
        if new_status == "published" and not was_published and a.course_id:
            for e in db.query(Enrollment).filter(Enrollment.course_id == a.course_id).all():
                db.add(Notification(user_id=e.student_id, title="Assignment Published",
                    message=f"'{a.title}' is now available.", type="assignment"))
    db.commit()
    db.refresh(a)
    return _aout(a)


def delete_attachment(assignment_id: int, attachment_id: int, facilitator_id: int, db: Session) -> dict:
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.created_by == facilitator_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")
    att = db.query(AssignmentAttachment).filter(
        AssignmentAttachment.id == attachment_id, AssignmentAttachment.assignment_id == assignment_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    full_path = os.path.join(settings.upload_dir_abs, att.file_path)
    db.delete(att)
    db.commit()
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass
    return {"message": "Attachment deleted"}


# ── Question builder ─────────────────────────────────────────────────────────

def _option_out(o: QuestionOption, include_answer: bool) -> dict:
    out = {"id": o.id, "text": o.text, "order_num": o.order_num}
    if include_answer:
        out["is_correct"] = o.is_correct
        out["match_value"] = o.match_value
    return out


def _question_out(q: AssignmentQuestion, include_answer: bool) -> dict:
    base = {
        "id": q.id, "text": q.text, "type": q.type, "points": q.points,
        "required": q.required, "order_num": q.order_num,
    }
    if q.type == "matching" and not include_answer:
        # The right-hand answer bank must be visible to answer the question at all —
        # what has to stay hidden is which one pairs with which left-hand item, so
        # ship it as an unpaired, shuffled list rather than each option's match_value.
        right_choices = [o.match_value for o in q.options if o.match_value]
        random.shuffle(right_choices)
        base["options"] = [{"id": o.id, "text": o.text, "order_num": o.order_num} for o in q.options]
        base["right_choices"] = right_choices
        return base
    base["options"] = [_option_out(o, include_answer) for o in q.options]
    return base


def _owned_assignment(assignment_id: int, facilitator_id: int, db: Session) -> Assignment:
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.created_by == facilitator_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")
    return a


def save_questions(assignment_id: int, payload: QuestionsSetIn, facilitator_id: int, db: Session) -> list:
    """Replaces the assignment's full question set (simplest correct semantics for
    an editable form that resubmits everything on Save)."""
    a = _owned_assignment(assignment_id, facilitator_id, db)
    db.query(AssignmentQuestion).filter(AssignmentQuestion.assignment_id == a.id).delete()
    db.flush()
    for i, qin in enumerate(payload.questions):
        q = AssignmentQuestion(
            assignment_id=a.id, text=qin.text, type=qin.type,
            points=qin.points, required=qin.required, order_num=qin.order_num or i,
        )
        db.add(q)
        db.flush()
        for j, oin in enumerate(qin.options):
            db.add(QuestionOption(
                question_id=q.id, text=oin.text, is_correct=oin.is_correct,
                match_value=oin.match_value, order_num=oin.order_num or j,
            ))
    db.commit()
    db.refresh(a)
    return [_question_out(q, include_answer=True) for q in a.questions]


def get_questions_for_facilitator(assignment_id: int, facilitator_id: int, db: Session) -> list:
    a = _owned_assignment(assignment_id, facilitator_id, db)
    return [_question_out(q, include_answer=True) for q in a.questions]


def get_questions_for_student(assignment_id: int, student_id: int, db: Session) -> dict:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    questions = list(a.questions)
    if a.randomize_questions:
        random.shuffle(questions)
    out_questions = []
    for q in questions:
        qd = _question_out(q, include_answer=False)
        if a.randomize_choices and q.type in ("multiple_choice", "multiple_select", "dropdown"):
            random.shuffle(qd["options"])
        out_questions.append(qd)
    attempts_used = db.query(Submission).filter(
        Submission.assignment_id == assignment_id, Submission.student_id == student_id,
    ).count()
    return {
        "questions": out_questions,
        "time_limit_minutes": a.time_limit_minutes,
        "max_attempts": a.max_attempts,
        "attempts_used": attempts_used,
        "attempts_remaining": max(0, a.max_attempts - attempts_used),
    }


def _grade_objective(question: AssignmentQuestion, answer) -> tuple:
    """Auto-grade one auto-gradable question. Returns (is_correct, points_awarded)."""
    if question.type in ("multiple_choice", "dropdown", "true_false"):
        correct_ids = {o.id for o in question.options if o.is_correct}
        selected = set(answer.selected_option_ids or [])
        ok = selected == correct_ids and len(selected) == 1
        return ok, (question.points if ok else 0.0)
    if question.type == "multiple_select":
        correct_ids = {o.id for o in question.options if o.is_correct}
        selected = set(answer.selected_option_ids or [])
        ok = selected == correct_ids
        return ok, (question.points if ok else 0.0)
    if question.type == "matching":
        pairs = [o for o in question.options if o.match_value]
        if not pairs:
            return None, None
        given = answer.matching_answers or {}
        correct_count = sum(
            1 for o in pairs
            if (given.get(str(o.id)) or "").strip().lower() == (o.match_value or "").strip().lower()
        )
        ok = correct_count == len(pairs)
        return ok, round(question.points * correct_count / len(pairs), 2)
    return None, None


def submit_answers(assignment_id: int, student_id: int, payload: AnswersSubmitIn,
                   file_answers: dict, db: Session) -> SubmissionOut:
    """file_answers: {question_id: (relative_file_path, original_filename)} for file_upload questions."""
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if a.status != "published":
        raise HTTPException(status_code=400, detail="This assignment isn't open for submissions")

    attempts_used = db.query(Submission).filter(
        Submission.assignment_id == assignment_id, Submission.student_id == student_id,
    ).count()
    if attempts_used >= a.max_attempts:
        raise HTTPException(status_code=400, detail="No attempts remaining")

    questions_by_id = {q.id: q for q in a.questions}
    s = Submission(
        assignment_id=assignment_id, student_id=student_id,
        submission_type="questions", attempt_number=attempts_used + 1,
    )
    db.add(s)
    db.flush()

    all_auto_graded = True
    total_points = 0.0
    for ans in payload.answers:
        q = questions_by_id.get(ans.question_id)
        if not q:
            continue
        resp = QuestionResponse(
            submission_id=s.id, question_id=q.id,
            answer_text=ans.answer_text,
            selected_option_ids=ans.selected_option_ids,
            matching_answers=ans.matching_answers,
        )
        if q.type in AUTO_GRADED_TYPES:
            resp.is_correct, resp.points_awarded = _grade_objective(q, ans)
            if resp.points_awarded is not None:
                total_points += resp.points_awarded
        else:
            all_auto_graded = False
        db.add(resp)

    for qid, (fpath, fname) in (file_answers or {}).items():
        q = questions_by_id.get(qid)
        if not q:
            continue
        all_auto_graded = False
        db.add(QuestionResponse(submission_id=s.id, question_id=qid, file_path=fpath))

    if all_auto_graded and questions_by_id:
        s.grade = round(total_points, 2)
        s.graded_at = datetime.utcnow()

    if a.created_by:
        db.add(Notification(user_id=a.created_by, title="New Submission",
            message=f"A student submitted '{a.title}' (attempt {s.attempt_number}).", type="assignment"))
    db.commit()
    db.refresh(s)
    out = SubmissionOut.model_validate(s)
    out.assignment_title = a.title
    out.answers = _submission_answers(s)
    return out


def _submission_answers(s: Submission) -> list:
    result = []
    for r in s.answers:
        q = r.question
        result.append({
            "id": r.id, "question_id": r.question_id,
            "question_text": q.text if q else None, "question_type": q.type if q else None,
            "question_points": q.points if q else None,
            "answer_text": r.answer_text, "selected_option_ids": r.selected_option_ids,
            "matching_answers": r.matching_answers, "file_path": r.file_path,
            "is_correct": r.is_correct, "points_awarded": r.points_awarded,
        })
    return result


def get_submission_detail(submission_id: int, viewer_id: int, viewer_role: str, db: Session) -> SubmissionOut:
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    is_owner_student = viewer_role == "student" and s.student_id == viewer_id
    is_owner_facilitator = viewer_role in ("facilitator", "admin") and s.assignment.created_by == viewer_id
    if not (is_owner_student or is_owner_facilitator):
        raise HTTPException(status_code=403, detail="Not authorized")
    out = SubmissionOut.model_validate(s)
    if s.student:
        out.student_name = f"{s.student.first_name} {s.student.last_name}"
    out.assignment_title = s.assignment.title if s.assignment else None
    out.answers = _submission_answers(s)
    return out


def grade_question_response(response_id: int, data: GradeAnswer, facilitator_id: int, db: Session) -> dict:
    r = db.query(QuestionResponse).filter(QuestionResponse.id == response_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Answer not found")
    submission = r.submission
    if not submission or submission.assignment.created_by != facilitator_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    r.points_awarded = data.points_awarded
    db.commit()

    # Recompute the submission's overall grade from whatever's been graded so far
    total = sum(a.points_awarded for a in submission.answers if a.points_awarded is not None)
    submission.grade = round(total, 2)
    submission.graded_at = datetime.utcnow()
    db.add(Notification(user_id=submission.student_id, title="Assignment Graded",
        message=f"Your assignment '{submission.assignment.title}' has an updated score.", type="assignment"))
    db.commit()
    if submission.assignment.course_id:
        from api.controller.course_controller import recalculate_pass_status
        recalculate_pass_status(submission.student_id, submission.assignment.course_id, db)
    return {"message": "Graded", "submission_grade": submission.grade}


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
        out.answers = _submission_answers(s)
        result.append(out)
    return result
