from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from api.database import get_db
from api.schemas.study import StudyPingIn
from api.controller import study_controller
from api.utils.auth import get_current_user
from api.model.user import User

router = APIRouter(prefix="/study-time", tags=["Study Time"])


@router.post("/ping")
def ping(data: StudyPingIn = StudyPingIn(), db: Session = Depends(get_db),
          current_user: User = Depends(get_current_user)):
    return study_controller.ping(current_user.id, data.course_id, db)


@router.get("/weekly")
def weekly(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return study_controller.weekly(current_user.id, db)


@router.get("/breakdown")
def breakdown(
    period: str = Query("week", pattern="^(day|week|month|year|custom)$"),
    start: Optional[date] = None,
    end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return study_controller.breakdown(current_user.id, period, start, end, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
