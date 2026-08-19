from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from api.settings import settings

_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from api.model import user, course, assignment, resource, message, notification, canvas  # noqa
    from api.model import course_content  # noqa
    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """Safe ALTER TABLE / CREATE TABLE migrations — works on both SQLite and PostgreSQL."""
    if _is_sqlite:
        migrations = [
            "ALTER TABLE enrollments ADD COLUMN pass_status VARCHAR(20) DEFAULT 'in_progress'",
            "CREATE TABLE IF NOT EXISTS invitations (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL REFERENCES courses(id), student_id INTEGER NOT NULL REFERENCES users(id), invited_by INTEGER NOT NULL REFERENCES users(id), status VARCHAR(20) DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "ALTER TABLE canvas_notes ADD COLUMN book_id INTEGER REFERENCES canvas_books(id)",
            "CREATE TABLE IF NOT EXISTS course_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL REFERENCES courses(id), name VARCHAR(100) NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS group_members (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL REFERENCES course_groups(id), student_id INTEGER NOT NULL REFERENCES users(id), added_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "ALTER TABLE resources ADD COLUMN course_id INTEGER REFERENCES courses(id)",
        ]
    else:
        # PostgreSQL syntax
        migrations = [
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS pass_status VARCHAR(20) DEFAULT 'in_progress'",
            """CREATE TABLE IF NOT EXISTS invitations (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id),
                student_id INTEGER NOT NULL REFERENCES users(id),
                invited_by INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            "ALTER TABLE canvas_notes ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES canvas_books(id)",
            """CREATE TABLE IF NOT EXISTS course_groups (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS group_members (
                id SERIAL PRIMARY KEY,
                group_id INTEGER NOT NULL REFERENCES course_groups(id),
                student_id INTEGER NOT NULL REFERENCES users(id),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            "ALTER TABLE resources ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id)",
        ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception:
                pass  # column/table already exists
