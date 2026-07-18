# Captions Studio Backend

A FastAPI backend for the Captions Studio video caption editing platform.

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ with SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) + bcrypt
- **File Storage**: AWS S3 or local MinIO
- **Background Jobs**: Celery + Redis

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Pydantic settings
│   ├── dependencies.py         # FastAPI dependencies
│   ├── database.py             # SQLAlchemy setup
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic schemas
│   ├── routers/                # API route handlers
│   ├── services/               # Business logic
│   ├── tasks/                  # Celery background tasks
│   └── utils/                  # Helper utilities
├── alembic/                    # Database migrations
├── tests/                      # Test suite
├── celery_worker.py            # Celery worker entry
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
└── Dockerfile                  # Container config
```

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Setup Database

Create a PostgreSQL database:

```bash
createdb captions_studio
```

Run migrations:

```bash
alembic upgrade head
```

### 5. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 6. Run Celery Worker (for background tasks)

```bash
celery -A celery_worker worker --loglevel=info
```

## API Overview

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Get JWT token
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects/` - List projects
- `POST /api/v1/projects/` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Series
- `GET /api/v1/series/` - List series
- `POST /api/v1/series/` - Create series
- `GET /api/v1/series/{id}` - Get series with episodes

### Segments
- `GET /api/v1/projects/{id}/segments` - Get segments
- `POST /api/v1/projects/{id}/segments` - Create segment
- `PUT /api/v1/segments/{id}` - Update segment

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing key | required |
| `AWS_ACCESS_KEY_ID` | S3 access key | optional |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | optional |
| `AWS_BUCKET_NAME` | S3 bucket name | optional |

## Testing

```bash
pytest
```

With coverage:

```bash
pytest --cov=app --cov-report=html
```

## License

Private
