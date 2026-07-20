# Project Structure

```
caption/

├── frontend/
│
├── backend/
│
├── docs/
│
├── CLAUDE.md
│
└── README.md
```

---

# Frontend

```
frontend/

app/
components/
hooks/
views/
lib/
public/
styles/
```

## app/

Contains App Router pages and layouts.

Keep routing logic here.

---

## components/

Reusable UI components.

Avoid page-specific business logic.

---

## hooks/

Reusable React hooks.

Responsible for:

* API interaction
* reusable state
* shared logic

---

## views/

Page-level UI.

Responsible for assembling components.

---

## lib/

Shared utilities.

Examples:

* API client
* helper functions
* constants

---

# Backend

```
backend/

app/

alembic/

tests/
```

---

## models/

SQLAlchemy ORM models.

Database representation only.

---

## schemas/

Pydantic request/response models.

Never expose ORM models directly.

---

## routers/

HTTP endpoints.

Keep routers thin.

---

## services/

Business logic.

Most backend work should happen here.

---

## tasks/

Background jobs.

Long-running processing should be placed here.

---

## utils/

Shared backend utilities.

Avoid business logic here.

---

# Documentation

```
docs/

architecture.md

frontend.md

backend.md

database.md

api.md

development.md

deployment.md

roadmap.md

code-style.md

project-structure.md
```

---

# Adding New Code

When adding a feature:

1. Reuse existing folders.
2. Follow naming conventions.
3. Avoid creating new top-level directories.
4. Keep similar functionality together.

---

# Folder Philosophy

Large folders should represent responsibilities.

Small helper files should stay close to where they are used.

Do not create deep nesting unless necessary.

A predictable structure is more valuable than a perfect one.
