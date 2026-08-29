from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from api.database import get_db
from api.schemas.user import UserRegistration, UserLogin, UserOut, UserUpdate, TokenResponse
from api.controller import auth_controller
from api.controller import otp_controller
from api.utils.auth import get_current_user
from api.model.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegistration, db: Session = Depends(get_db)):
    return auth_controller.register_user(data, db)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    return auth_controller.login_user(data, db)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    from api.controller.admin_controller import update_user
    return update_user(current_user.id, data, db)


# ── Users listing (for messaging) ────────────────────────────────────────────

@router.get("/users")
def list_users(
    q: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.is_active == True, User.id != current_user.id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (User.first_name.ilike(like)) |
            (User.last_name.ilike(like)) |
            (User.email.ilike(like))
        )
    users = query.order_by(User.first_name).all()
    return [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": u.role,
            "school": u.school,
            "grade": u.grade,
        }
        for u in users
    ]


# ── OTP / Password reset ──────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    code: str
    new_password: str


@router.post("/request-otp")
def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    return otp_controller.request_otp(data.email, db)


@router.post("/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    return otp_controller.verify_and_update(data.email, data.code, data.new_password, db)
