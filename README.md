# Captions Studio

A professional video caption editing and management platform.

**📚 Full Documentation: [CLAUDE.md](./CLAUDE.md)**

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
# http://localhost:8001/docs
```

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Foundation (Frontend + Backend + Auth) |
| Phase 2 | ⏳ Pending | Core Editor Features |
| Phase 3 | ⏳ Pending | Transcription (Whisper) |
| Phase 4 | ⏳ Pending | Translation |
| Phase 5 | ⏳ Pending | Export (SRT/VTT/Video) |

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy 2.0 + JWT Auth
- **Tasks**: Celery + Redis

## Project Structure

```
/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── lib/          # Utilities
├── backend/          # FastAPI backend
│   ├── app/          # Application code
│   ├── alembic/      # Database migrations
│   └── tests/        # Test suite
└── CLAUDE.md         # 📚 Full Documentation
```

## Database Setup

## Database

create db
```
Step 1. Create the directories
mkdir -p /storage5/caption/postgres/data
sudo chown -R postgres:postgres /storage5/caption/postgres

Step 2. Initialize the database cluster
sudo -u postgres /usr/lib/postgresql/16/bin/initdb \
    -D /storage5/caption/postgres/data

Step 3. Start PostgreSQL
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl \
    -D /storage5/caption/postgres/data \
    -l /storage5/caption/postgres/postgres.log \
    start

Step 4. create db
psql -U postgres
CREATE DATABASE captions_studio;

Stept 5. 
CREATE ROLE captions_user WITH LOGIN PASSWORD 'chiranjiv';
ALTER ROLE captions_user CREATEDB;
ALTER DATABASE captions_studio OWNER TO captions_user;
GRANT ALL PRIVILEGES ON DATABASE captions_studio TO captions_user;
\q

Step 6. if new database then run this command to create table in database
python -m alembic upgrade head

```

## License

Private