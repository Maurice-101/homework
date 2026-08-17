import random
import string
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from api.model.otp import OTP
from api.model.user import User
from api.utils.password import hash_password
from api.settings import settings


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def _send_email(to_email: str, code: str):
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_user = settings.smtp_user
    smtp_pass = settings.smtp_pass
    smtp_from = settings.smtp_from_or_user

    print(f"\n[OTP] Code for {to_email}: {code}  (expires in 15 min)\n")

    if not smtp_host or not smtp_user:
        return  # dev mode – code already printed above

    body = (
        f"Your Homework Platform verification code is:\n\n"
        f"  {code}\n\n"
        f"This code expires in 15 minutes.\n"
        f"If you did not request this, ignore this message."
    )
    msg = MIMEText(body, "plain")
    msg["Subject"] = "Homework Platform – Verification Code"
    msg["From"] = smtp_from
    msg["To"] = to_email
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.sendmail(smtp_from, [to_email], msg.as_string())
    except Exception as exc:
        print(f"[WARN] Email send failed ({exc}). OTP still valid.")


def request_otp(email: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email address.")

    # Invalidate any previous unused OTPs for this email
    db.query(OTP).filter(OTP.email == email, OTP.used == False).update({"used": True})
    db.commit()

    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.add(OTP(email=email, code=code, expires_at=expires_at))
    db.commit()

    _send_email(email, code)
    return {"message": "Verification code sent to your email address."}


def verify_and_update(email: str, code: str, new_password: str, db: Session) -> dict:
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    otp = (
        db.query(OTP)
        .filter(
            OTP.email == email,
            OTP.code == code,
            OTP.used == False,
            OTP.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(new_password)
    otp.used = True
    db.commit()
    return {"message": "Password updated successfully."}
