# Captions Studio - Full Stack Documentation

## Project Overview

Captions Studio is a professional video caption editing and management platform. It consists of a Next.js frontend and a FastAPI backend, providing a complete solution for video transcription, translation, and caption export.

## Project Structure

```
/storage5/caption/
├── frontend/                 # Next.js 16 Application
│   ├── app/                 # App Router structure
│   │   ├── components/      # Shared UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── views/           # Page views (projects, editor, series, assets)
│   │   ├── data/            # Static data and constants
│   │   ├── lib/             # Utilities and API client
│   │   ├── login/           # Auth pages
│   │   └── register/
│   ├── components/ui/       # shadcn/ui components
│   └── public/              # Static assets
│
└── backend/                 # FastAPI Python Application
    ├── app/
    │   ├── models/          # SQLAlchemy ORM models
    │   ├── schemas/         # Pydantic request/response schemas
    │   ├── routers/         # API route handlers
    │   ├── services/        # Business logic layer
    │   ├── tasks/           # Celery background tasks
    │   └── utils/           # Helper utilities
    ├── alembic/             # Database migrations
    └── tests/               # Test suite
```

---

## Architecture

### Frontend Architecture (Next.js 16)

#### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS with OKLCH color system
- **UI Components**: shadcn/ui + Radix UI primitives
- **State Management**: React Context + useReducer
- **Build Tool**: Turbopack
- **Package Manager**: npm

#### Key Design Patterns
1. **App Router**: File-based routing with layout nesting
2. **Server/Client Components**: Strategic splitting for performance
3. **Custom Hooks**: Reusable logic in `app/hooks/`
4. **Component Composition**: Building complex UIs from simple components

#### State Management
```typescript
// Global state via React Context
AppState: {
  // View state
  view: 'projects' | 'series' | 'assets' | 'editor',
  theme: 'light' | 'dark',

  // Project state
  projects: Project[],
  activeProject: Project | null,

  // Editor state
  segments: Segment[],
  speakers: Speaker[],
  currentTime: number,
  playing: boolean,

  // UI State
  dialogOpen: boolean,
  menus: MenuState,
  ...
}
```

### Backend Architecture (FastAPI)

#### Tech Stack
- **Framework**: FastAPI 0.109
- **Language**: Python 3.10+
- **Database**: PostgreSQL 15+ with asyncpg
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) + bcrypt
- **Tasks**: Celery + Redis
- **Storage**: AWS S3 / MinIO (optional)

#### Layer Structure
```
Request → Router → Service → Model → Database
              ↓
        Validation (Pydantic)
              ↓
        Response (Pydantic Schema)
```

#### Database Schema

**Core Tables:**
- `users` - Authentication, credits, profile
- `projects` - Caption projects with metadata
- `series` - Project grouping with shared speakers/terms
- `episodes` - Projects within series
- `segments` - Caption timing data
- `segment_texts` - Multi-language text content
- `speakers` - Project-specific speakers
- `series_speakers` - Shared speakers across series
- `series_terms` - Translation glossary terms
- `assets` - File storage metadata
- `project_shares` - Collaboration permissions

---

## Implementation Status

### Phase 1: Foundation ✅ COMPLETED

#### Frontend (Phase 1)
| Feature | Status | Notes |
|---------|--------|-------|
| Project structure | ✅ | Next.js 16 + App Router |
| UI Components | ✅ | shadcn/ui integrated |
| Theme system | ✅ | Light/Dark mode with OKLCH |
| App state management | ✅ | React Context + useReducer |
| Projects view | ✅ | List, filter, sort UI |
| Editor view | ✅ | Video player, timeline, caption editor |
| Series view | ✅ | Series management UI |
| Assets view | ✅ | File browser UI |
| TopBar | ✅ | Navigation, user menu |
| Toast notifications | ✅ | Feedback system |

#### Backend (Phase 1)
| Feature | Status | Notes |
|---------|--------|-------|
| FastAPI setup | ✅ | Project structure complete |
| Database models | ✅ | All core models defined |
| Database migrations | ✅ | Alembic configured |
| Authentication | ✅ | JWT register/login/refresh |
| Project CRUD | ✅ | Full CRUD with filtering |
| File upload API | ✅ | Presigned URLs + direct upload |
| API documentation | ✅ | Auto-generated OpenAPI/Swagger |

#### Integration (Phase 1)
| Feature | Status | Notes |
|---------|--------|-------|
| API client | ✅ | Centralized fetch with JWT |
| Auth context | ✅ | Login/logout/token refresh |
| Protected routes | ✅ | Redirect to login if unauthenticated |
| Projects API hook | ✅ | useProjects with caching |

### Phase 2: Core Editor Features ⏳ PENDING

#### Backend Tasks
| Feature | Priority | Notes |
|---------|----------|-------|
| Segments API | High | CRUD for caption segments |
| Speakers API | High | Manage speakers per project |
| Series management API | Medium | Full series CRUD |
| Episode management | Medium | Ordering within series |
| Project search | Medium | Full-text search |
| Soft delete | Low | Trash/recycle bin |

#### Frontend Tasks
| Feature | Priority | Notes |
|---------|----------|-------|
| Create project modal | High | Form with validation |
| Segment CRUD | High | Add/edit/delete segments |
| Real-time save | Medium | Auto-save segments |
| Keyboard shortcuts | Medium | Editor hotkeys |
| Undo/Redo | Low | Action history |

### Phase 3: Transcription ⏳ PENDING

| Feature | Priority | Notes |
|---------|----------|-------|
| Whisper integration | High | OpenAI Whisper API |
| Upload video | High | Direct to S3 |
| Transcription jobs | High | Celery background tasks |
| Progress tracking | Medium | WebSocket or polling |
| Speaker diarization | Low | pyannote.audio |

### Phase 4: Translation ⏳ PENDING

| Feature | Priority | Notes |
|---------|----------|-------|
| Translation service | High | DeepL/Google Translate |
| Multi-lang segments | High | Store translations |
| Glossary support | Medium | Series-specific terms |
| Batch translate | Medium | Translate all segments |

### Phase 5: Export ⏳ PENDING

| Feature | Priority | Notes |
|---------|----------|-------|
| SRT export | High | Standard subtitle format |
| VTT export | High | WebVTT format |
| TXT export | Medium | Plain transcript |
| Burn captions | Medium | FFmpeg video export |
| Export jobs | Medium | Background processing |

### Phase 6: Polish ⏳ PENDING

| Feature | Priority | Notes |
|---------|----------|-------|
| Redis caching | Low | API response caching |
| Rate limiting | Low | Per-user quotas |
| Email notifications | Low | Job completion |
| Admin dashboard | Low | User management |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/me` | Update profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/` | List projects (paginated) |
| POST | `/api/v1/projects/` | Create project |
| GET | `/api/v1/projects/{id}` | Get project details |
| PUT | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete project |
| POST | `/api/v1/projects/{id}/favorite` | Toggle favorite |
| POST | `/api/v1/projects/{id}/archive` | Toggle archive |
| POST | `/api/v1/projects/{id}/duplicate` | Duplicate project |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/assets/` | List assets |
| POST | `/api/v1/assets/presigned-url` | Get upload URL |
| POST | `/api/v1/assets/upload` | Direct upload |
| GET | `/api/v1/assets/{id}/download` | Download file |

---

## Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://platyserver.ddns.net/studio/caption/api/
```

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://captions_user:chiranjiv@localhost:5432/captions_studio

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=your-secret-key-here-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_ENV=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://caption.chiranjivra37.workers.dev

# File Upload
MAX_UPLOAD_SIZE=500000000
UPLOAD_CHUNK_SIZE=10485760
```

---

## Development Setup

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- PostgreSQL 15+ (database)
- Redis (optional, for Celery)

### Frontend Setup
```bash
cd /storage5/caption/frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

### Backend Setup
```bash
cd /storage5/caption/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb captions_studio
alembic upgrade head

# Run server
uvicorn app.main:app --reload --port 8001
# API docs at http://localhost:8001/docs
```

---

## Key Files Reference

### Frontend
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Main page with view router |
| `app/hooks/use-app-state.tsx` | Global state management |
| `app/hooks/use-auth.tsx` | Authentication state |
| `app/hooks/use-projects.tsx` | Projects API integration |
| `app/lib/api.ts` | API client and endpoints |
| `app/views/projects-view.tsx` | Projects list UI |
| `app/views/editor-view.tsx` | Caption editor UI |
| `app/components/topbar.tsx` | Navigation header |

### Backend
| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app entry point |
| `app/config.py` | Pydantic settings |
| `app/database.py` | SQLAlchemy setup |
| `app/dependencies.py` | Auth dependencies |
| `app/models/*.py` | Database models |
| `app/schemas/*.py` | Pydantic schemas |
| `app/routers/*.py` | API routes |
| `app/services/*.py` | Business logic |

---

## Testing

### Backend Tests
```bash
cd /storage5/caption/backend
pytest
pytest --cov=app --cov-report=html
```

### Frontend Tests
```bash
cd /storage5/caption/frontend
# Add test commands when configured
```

---

## Deployment Notes

### Production Checklist
- [ ] Change `SECRET_KEY` to strong random value
- [ ] Set `APP_ENV=production`
- [ ] Configure production database
- [ ] Set up S3/MinIO for file storage
- [ ] Configure Redis for Celery
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring/logging

---

## Common Issues & Solutions

### Issue: PostgreSQL not running
**Solution:**
```bash
sudo service postgresql start
# or
sudo systemctl start postgresql
```

### Issue: Database not found
**Solution:**
```bash
createdb captions_studio
alembic upgrade head
```

### Issue: Port already in use
**Solution:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

---

## Changelog

### 2024-01-XX - Phase 1 Complete
- ✅ Next.js frontend with full UI
- ✅ FastAPI backend with auth
- ✅ Database models and migrations
- ✅ API integration
- ✅ JWT authentication
- ✅ Project CRUD operations

---

## Next Steps

1. **Immediate:** Test full flow - register → login → view projects
2. **Phase 2:** Implement segment CRUD in editor
3. **Phase 2:** Add create project functionality
4. **Phase 3:** Integrate Whisper for transcription
5. **Phase 4:** Add translation features
6. **Phase 5:** Build export functionality

---

## Contributing Guidelines

### Code Style
- **Frontend**: ESLint + Prettier
- **Backend**: Black + Ruff + MyPy

### Commit Messages
Format: `<type>: <description>`
Types: feat, fix, docs, style, refactor, test, chore

Example: `feat: add segment delete endpoint`

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## Contact & Support

Project maintained by: Chiranjiv
For questions or issues, refer to this documentation first, then check the code comments.
