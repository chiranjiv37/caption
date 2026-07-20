# CLAUDE.md

# Captions Studio

Captions Studio is a full-stack AI platform for caption editing, transcription, translation, dubbing, and media asset management.

This repository contains two independent applications:

* `frontend/` – Next.js 16 + TypeScript
* `backend/` – FastAPI + PostgreSQL

---

# Repository Structure

```
frontend/
backend/
docs/
```

Refer to the corresponding `CLAUDE.md` inside `frontend/` or `backend/` when working in those directories.

Detailed documentation is available in `docs/`.

---

# Architecture

The frontend **never accesses the database directly**.

Communication flow:

```
Frontend
    ↓
REST API
    ↓
FastAPI
    ↓
Service Layer
    ↓
Database
```

Business logic belongs in backend services.

The frontend should focus on UI, state management, and user experience.

---

# General Development Rules

Always:

* Understand the existing implementation before making changes.
* Follow the project's naming conventions.
* Prefer modifying existing code over introducing new patterns.
* Keep changes small and focused.
* Avoid unnecessary abstractions.
* Reuse existing utilities whenever possible.

Never:

* Rewrite large sections without a reason.
* Introduce a new architecture unless requested.
* Duplicate business logic.
* Break existing API contracts unless explicitly instructed.

---

# Development Workflow

When implementing a feature:

1. Understand the current implementation.
2. Search for similar functionality.
3. Reuse existing patterns.
4. Keep the implementation consistent.
5. Update documentation only if behavior changes.

---

# Documentation

Additional documentation lives in:

* docs/architecture.md
* docs/frontend.md
* docs/backend.md
* docs/database.md
* docs/api.md
* docs/development.md
* docs/deployment.md
* docs/roadmap.md

Only consult these documents when the current task requires them.

---

# Coding Philosophy

Prefer:

* readability
* maintainability
* consistency
* explicit code

over clever solutions.

The best implementation is the one that matches the existing codebase.
