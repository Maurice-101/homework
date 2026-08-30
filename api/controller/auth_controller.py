import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.model.user import User
from api.model.notification import Notification
from api.schemas.user import UserRegistration, UserLogin, UserOut, TokenResponse
from api.utils.password import hash_password, verify_password
from api.utils.jwt import create_access_token


def register_user(data: UserRegistration, db: Session) -> TokenResponse:
    if db.query(User).filter(User.email == data.email_address).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email_address,
        hashed_password=hash_password(data.password),
        role=data.role.value,
        school=data.school,
        grade=data.grade,
        country=data.country,
        city=data.city,
        nationality=data.nationality,
        languages_spoken=json.dumps(data.languages_spoken) if data.languages_spoken else None,
        goals=json.dumps(data.goals) if data.goals else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(Notification(
        user_id=user.id,
        title="Welcome to Abahizi Platform!",
        message=f"Hi {user.first_name}, your account has been created successfully.",
        type="system",
    ))
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


def login_user(data: UserLogin, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.email == data.user_email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))
