# CLAUDE.md

# Backend Development Guide

Tech Stack

* FastAPI
* SQLAlchemy Async
* PostgreSQL
* Alembic
* Pydantic
* JWT Authentication

---

# Responsibilities

The backend owns:

* business logic
* validation
* authentication
* authorization
* database access
* API contracts

Never move business logic into the frontend.

---

# Layered Architecture

Always follow:

```
Router
    ↓
Service
    ↓
Model
    ↓
Database
```

Routers should stay thin.

Services contain business logic.

Models represent persistence.

Schemas define API contracts.

---

# API Design

Endpoints should:

* validate input
* return consistent responses
* raise proper HTTP exceptions
* avoid duplicated logic

---

# Database

Prefer:

* async SQLAlchemy
* reusable queries
* transactions when needed

Avoid:

* duplicated queries
* N+1 query patterns
* database logic inside routers

---

# Services

Business rules belong inside services.

If multiple endpoints share logic, extract it into a service.

---

# Schemas

Use Pydantic models for:

* requests
* responses
* validation

Do not expose ORM models directly.

---

# Authentication

Always use the existing authentication dependencies.

Do not bypass authorization checks.

---

# Error Handling

Return meaningful HTTP errors.

Do not expose stack traces or internal implementation details.

---

# Before Adding Code

Search for:

* existing service
* existing model
* existing dependency
* existing utility

Extend existing implementations whenever possible.

---

# Coding Style

Prefer:

* explicit code
* small functions
* descriptive names
* reusable services

Avoid unnecessary abstraction.

---

# Goal

Every backend change should preserve API consistency, maintainability, and predictable behavior while following the existing project architecture.
