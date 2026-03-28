from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from api.database import Base


class OTP(Base):
    __tablename__ = "otps"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String(255), nullable=False, index=True)
    code       = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
