# Homework — Digital Learning Platform

A full-stack Learning Management System (LMS) built for secondary and higher education. Students, facilitators, and administrators interact through separate dashboards to manage courses, assignments, resources, communication, and progress tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy ORM |
| Auth | JWT (python-jose) + bcrypt |
| File Storage | Cloudflare R2 (S3-compatible) |
| Email | SMTP (OTP password reset) |
| Frontend | Vanilla HTML / CSS / JavaScript |

---

## Project Structure

```
home_2/
├── api/
│   ├── main.py                  # App entry point, static file serving
│   ├── requirements.txt
│   ├── config/                  # Environment variable loading
│   ├── database/                # SQLAlchemy engine + auto-migrations
│   ├── model/                   # ORM models
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── router/                  # API route definitions
│   ├── controller/              # Business logic
│   └── utils/                   # Auth helpers, JWT, R2 client
├── frontend/
│   ├── Logins/                  # Login & registration pages
│   ├── Students/                # Student dashboard
│   ├── Facilitators/            # Facilitator dashboard
│   ├── Admins/                  # Admin dashboard
│   ├── js/api.js                # Shared API client (fetch + auth)
│   └── Assets/                  # Avatars, images
├── uploads/                     # Local submission/assignment file storage
├── homework.db                  # SQLite database (auto-created)
├── .env                         # Environment variables (see below)
└── .env.example                 # Environment variable template
```

---

## Getting Started

### 1. Clone & set up environment

```bash
git clone https://github.com/BodeMurairi2/home_2.git
cd home_2
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r api/requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Core
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./homework.db
UPLOAD_DIR=./uploads

# SMTP — used for OTP password reset emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@example.com

# Cloudflare R2 — used for curriculum PDFs and textbooks
CLOUDFLARE_ACCESS_KEYID=your-r2-access-key
CLOUDFLARE_TOKEN_VALUE=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL_BASE=https://your-r2-public-url
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com/bucket
```

> If SMTP is not configured, OTP codes are printed to the server console instead.
> If R2 is not configured, the curriculum resource library will be empty.

### 3. Run

```bash
cd api
python main.py
# or
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The app is served at `http://localhost:8000`. The database and `uploads/` directory are created automatically on first run.

---

## Features

### Students
- Enroll in courses or accept invitations from facilitators
- Navigate course content: syllabus, modules, assignments, grades, people, discussions, announcements
- Read curriculum textbooks and PDFs directly inside the platform
- Submit assignments as text, URL, or PDF file upload
- View grades and facilitator feedback
- Track module completion and overall course progress
- Participate in discussions and course chat
- Send direct messages to facilitators and classmates
- Manage a personal virtual notebook (Canvas)
- View study groups and group membership

### Facilitators
- Create and manage courses (title, subject, grade level, cover)
- Add course modules with content
- Create assignments, quizzes, and exams with due dates and point values
- Grade student submissions with written feedback
- Post course announcements and create discussion threads
- Define course syllabus week by week with topics
- Invite students directly by email/search
- Create and manage study groups within courses
- Upload curriculum resources (textbooks, PDFs) to the cloud library
- View student progress per course

### Administrators
- View platform-wide statistics (users, courses, submissions)
- Approve or reject courses created by facilitators
- Manage user accounts (list, edit, activate/deactivate)
- Access all courses and users across the platform

---

## API Overview

Base URL: `/api` — all endpoints require a Bearer token except `/auth/register` and `/auth/login`.

| Route Group | Prefix | Description |
|---|---|---|
| Auth | `/auth` | Register, login, profile, OTP password reset |
| Courses | `/courses` | Course CRUD, enrollment, invitations, modules |
| Assignments | `/assignments` | Assignment CRUD, file submission, grading |
| Resources | `/resources` | PDF upload, serve from R2, browse by subject |
| Messages | `/messages` | Inbox, sent, direct conversations, course chat |
| Canvas | `/canvas` | Personal notebook books and pages |
| Notifications | `/notifications` | List and mark notifications as read |
| Course Content | `/courses/{id}/...` | Announcements, discussions, syllabus, groups |
| Admin | `/admin` | Stats, user management, course approval |

Interactive API docs are available at `http://localhost:8000/docs` when the server is running.

---

## User Roles

| Role | Created By | Access |
|---|---|---|
| `student` | Self-registration | Student dashboard |
| `facilitator` | Self-registration | Facilitator dashboard |
| `admin` | Direct DB or admin panel | Admin dashboard |

Role is assigned at registration and determines which dashboard the user is redirected to after login.

---

## Database

SQLite is used by default (`homework.db`). The schema is created and migrated automatically on startup — no manual migration steps needed. To switch to PostgreSQL or MySQL, update `DATABASE_URL` in `.env` (requires replacing the SQLite-specific `ALTER TABLE` migration logic in `api/database/__init__.py`).

---

## Deployment Notes

- The frontend is served as static files directly by FastAPI from the `/frontend` directory.
- Uploaded files (submissions, assignment attachments) are stored locally under `uploads/`. For production, migrate this to R2 or another object store.
- Set a strong random `SECRET_KEY` in production (e.g. `openssl rand -hex 32`).
- The SQLite database file (`homework.db`) should be excluded from version control in production and backed up regularly.
