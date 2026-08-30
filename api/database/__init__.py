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
    from api.model import course_content, study, ai_chat  # noqa
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
            "ALTER TABLE assignments ADD COLUMN status VARCHAR(20) DEFAULT 'draft'",
            "ALTER TABLE assignments ADD COLUMN available_from DATETIME",
            "ALTER TABLE assignments ADD COLUMN time_limit_minutes INTEGER",
            "ALTER TABLE assignments ADD COLUMN max_attempts INTEGER DEFAULT 1",
            "ALTER TABLE assignments ADD COLUMN randomize_questions BOOLEAN DEFAULT 0",
            "ALTER TABLE assignments ADD COLUMN randomize_choices BOOLEAN DEFAULT 0",
            "UPDATE assignments SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END WHERE status IS NULL",
            "ALTER TABLE submissions ADD COLUMN attempt_number INTEGER DEFAULT 1",
            "ALTER TABLE courses ADD COLUMN goals TEXT",
            "ALTER TABLE courses ADD COLUMN invite_code VARCHAR(12)",
            "CREATE TABLE IF NOT EXISTS announcement_reads (id INTEGER PRIMARY KEY AUTOINCREMENT, announcement_id INTEGER NOT NULL REFERENCES announcements(id), student_id INTEGER NOT NULL REFERENCES users(id), read_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS announcement_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, announcement_id INTEGER NOT NULL REFERENCES announcements(id), author_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS study_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL REFERENCES users(id), course_id INTEGER REFERENCES courses(id), date DATE NOT NULL, minutes INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id, date, course_id))",
            "ALTER TABLE courses ADD COLUMN level VARCHAR(20) DEFAULT 'Beginner'",
            "ALTER TABLE courses ADD COLUMN duration_hours INTEGER",
            "ALTER TABLE courses ADD COLUMN course_code VARCHAR(20)",
            "ALTER TABLE courses ADD COLUMN thumbnail_path VARCHAR(500)",
            "ALTER TABLE courses ADD COLUMN status VARCHAR(20) DEFAULT 'active'",
            "ALTER TABLE courses ADD COLUMN target_grade_percent INTEGER DEFAULT 80",
            "UPDATE courses SET status = 'active' WHERE status IS NULL",
            "UPDATE courses SET level = 'Beginner' WHERE level IS NULL",
            "UPDATE courses SET target_grade_percent = 80 WHERE target_grade_percent IS NULL",
            "ALTER TABLE resources ADD COLUMN file_size_bytes INTEGER",
            "CREATE TABLE IF NOT EXISTS course_team_members (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL REFERENCES courses(id), user_id INTEGER NOT NULL REFERENCES users(id), role VARCHAR(20) DEFAULT 'ta', added_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS course_meetings (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL REFERENCES courses(id), facilitator_id INTEGER NOT NULL REFERENCES users(id), student_id INTEGER REFERENCES users(id), scheduled_at DATETIME NOT NULL, duration_minutes INTEGER DEFAULT 30, status VARCHAR(20) DEFAULT 'scheduled', notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "ALTER TABLE users ADD COLUMN country VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN city VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN nationality VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN languages_spoken TEXT",
            "ALTER TABLE users ADD COLUMN goals TEXT",
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
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'",
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS available_from TIMESTAMP",
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER",
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1",
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT FALSE",
            "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS randomize_choices BOOLEAN DEFAULT FALSE",
            "UPDATE assignments SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END WHERE status IS NULL",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS goals TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12)",
            """CREATE TABLE IF NOT EXISTS announcement_reads (
                id SERIAL PRIMARY KEY,
                announcement_id INTEGER NOT NULL REFERENCES announcements(id),
                student_id INTEGER NOT NULL REFERENCES users(id),
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS announcement_comments (
                id SERIAL PRIMARY KEY,
                announcement_id INTEGER NOT NULL REFERENCES announcements(id),
                author_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS study_sessions (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id),
                course_id INTEGER REFERENCES courses(id),
                date DATE NOT NULL,
                minutes INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, date, course_id)
            )""",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'Beginner'",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours INTEGER",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(20)",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500)",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_grade_percent INTEGER DEFAULT 80",
            "UPDATE courses SET status = 'active' WHERE status IS NULL",
            "UPDATE courses SET level = 'Beginner' WHERE level IS NULL",
            "UPDATE courses SET target_grade_percent = 80 WHERE target_grade_percent IS NULL",
            "ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER",
            """CREATE TABLE IF NOT EXISTS course_team_members (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                role VARCHAR(20) DEFAULT 'ta',
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS course_meetings (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id),
                facilitator_id INTEGER NOT NULL REFERENCES users(id),
                student_id INTEGER REFERENCES users(id),
                scheduled_at TIMESTAMP NOT NULL,
                duration_minutes INTEGER DEFAULT 30,
                status VARCHAR(20) DEFAULT 'scheduled',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS languages_spoken TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS goals TEXT",
        ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception:
                pass  # column/table already exists

    _migrate_study_sessions_course_id()
    _backfill_course_and_resource_fields()


def _backfill_course_and_resource_fields():
    """One-shot pass filling course_code/duration_hours on existing courses and
    file_size_bytes on existing R2-backed resources, computed from real related
    data — never invented. Idempotent: only touches rows where the field is
    still NULL."""
    import urllib.parse
    from sqlalchemy.orm import sessionmaker
    from api.model.course import Course

    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        courses = db.query(Course).filter(
            (Course.course_code.is_(None)) | (Course.duration_hours.is_(None))
        ).all()
        for c in courses:
            if not c.course_code:
                subj = "".join(ch for ch in (c.subject or "GEN").upper() if ch.isalnum())[:4] or "GEN"
                c.course_code = f"{subj}-{c.id}"
            if c.duration_hours is None:
                weeks = len(c.syllabus_weeks or [])
                mods = len(c.modules or [])
                if weeks:
                    c.duration_hours = weeks * 3
                elif mods:
                    c.duration_hours = mods * 2
        if courses:
            db.commit()

        from api.model.resource import Resource
        from api.utils import r2
        resources = db.query(Resource).filter(Resource.file_size_bytes.is_(None)).all()
        changed = False
        for r in resources:
            file_path = r.file_path or ""
            key = None
            if "resources/serve?key=" in file_path:
                key = urllib.parse.unquote(file_path.split("key=", 1)[-1])
            if not key:
                continue
            try:
                size = r2.head_object(key)
            except Exception:
                size = None
            if size is not None:
                r.file_size_bytes = size
                changed = True
        if changed:
            db.commit()
    finally:
        db.close()


def _migrate_study_sessions_course_id():
    """Adds course_id to study_sessions and widens its uniqueness to (student_id, date,
    course_id) so a student can accrue minutes per subject per day, not just per day.
    SQLite can't ALTER a UNIQUE constraint in place, so on SQLite this rebuilds the table
    — existing rows are preserved with course_id = NULL (time not tied to a subject)."""
    from sqlalchemy import text
    with engine.connect() as conn:
        if _is_sqlite:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(study_sessions)")).fetchall()]
            if "course_id" in cols:
                return
            conn.execute(text("ALTER TABLE study_sessions RENAME TO study_sessions_old"))
            conn.execute(text("""CREATE TABLE study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES users(id),
                course_id INTEGER REFERENCES courses(id),
                date DATE NOT NULL,
                minutes INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, date, course_id)
            )"""))
            conn.execute(text("""INSERT INTO study_sessions (id, student_id, course_id, date, minutes, updated_at)
                SELECT id, student_id, NULL, date, minutes, updated_at FROM study_sessions_old"""))
            conn.execute(text("DROP TABLE study_sessions_old"))
            conn.commit()
        else:
            cols = [r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='study_sessions'"
            )).fetchall()]
            if "course_id" not in cols:
                conn.execute(text("ALTER TABLE study_sessions ADD COLUMN course_id INTEGER REFERENCES courses(id)"))
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_student_id_date_key') THEN
                        ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_student_id_date_key;
                    END IF;
                END $$;
            """))
            conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_study_session_student_date_course "
                "ON study_sessions(student_id, date, course_id)"
            ))
            conn.commit()
