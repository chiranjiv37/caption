# Development Guide

# Repository

```
caption/

frontend/

backend/

docs/
```

---

# Local Development

Frontend

```
cd frontend
npm install
npm run dev
```

Backend

```
cd backend

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

alembic upgrade head

uvicorn app.main:app --reload --port 8001
```

---

# Development Workflow

Before writing code

1. Understand the problem.
2. Search existing implementation.
3. Reuse existing code.
4. Follow project conventions.

---

# Feature Workflow

New feature

↓

Backend

↓

API

↓

Frontend Hook

↓

UI

↓

Testing

Always build from backend toward frontend.

---

# Bug Fix Workflow

1. Reproduce.
2. Identify root cause.
3. Implement smallest fix.
4. Test.
5. Verify no regression.

Avoid rewriting unrelated code.

---

# Git Workflow

Small commits.

Descriptive commit messages.

Example

```
feat: add project archive endpoint

fix: refresh token handling

refactor: simplify editor state
```

---

# Testing

Every feature should be tested for

* happy path
* invalid input
* authentication
* permissions
* edge cases

---

# Before Creating New Files

Search for existing

* component
* hook
* service
* utility
* model

Reuse before creating.

---

# Performance

Avoid

* unnecessary renders
* repeated API calls
* duplicated database queries

Prefer optimization only after correctness.

---

# Debugging

When debugging

1. reproduce
2. inspect logs
3. inspect request
4. inspect database
5. inspect frontend state

Avoid guessing.

---

# Documentation

When behavior changes

* update docs
* update API contract
* update migrations if needed

Documentation should evolve with the codebase.

---

# Development Philosophy

Simple

Consistent

Maintainable

Reusable

These are preferred over clever implementations.
