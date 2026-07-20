# Backend Documentation

# Overview

The backend is a FastAPI application responsible for all business logic.

Responsibilities:

* Authentication
* Authorization
* Validation
* Database
* Caption management
* Assets
* Background processing

The frontend should never implement backend business rules.

---

# Technology Stack

Framework

* FastAPI

ORM

* SQLAlchemy Async

Database

* PostgreSQL

Validation

* Pydantic

Authentication

* JWT

Database Migration

* Alembic

Background Processing

* Celery

---

# Layered Architecture

Every request follows:

```text
Client

↓

Router

↓

Service

↓

Model

↓

Database

↓

Schema

↓

Response
```

---

# Routers

Responsibilities:

* request validation
* authentication
* dependency injection
* response generation

Routers should remain thin.

---

# Services

Business logic belongs here.

Examples:

* project creation
* permission checks
* asset processing
* caption operations

Whenever logic is shared between endpoints, move it into services.

---

# Models

Models represent database tables.

Keep models focused on persistence.

Avoid placing application logic inside ORM models.

---

# Schemas

Schemas define:

* requests
* responses
* validation

Always return schemas instead of ORM objects.

---

# Authentication

Authentication is handled centrally.

Always:

* verify permissions
* protect private resources
* validate ownership

Never bypass authorization checks.

---

# Database

Use async SQLAlchemy.

Prefer:

* reusable queries
* eager loading when appropriate
* transactions

Avoid:

* duplicated queries
* N+1 problems
* raw SQL unless necessary

---

# Background Jobs

Long-running work should execute asynchronously.

Examples:

* transcription
* translation
* export
* AI processing

API requests should return immediately whenever possible.

---

# Error Handling

Raise meaningful HTTP exceptions.

Log unexpected failures.

Do not expose internal implementation details.

---

# API Design

Maintain consistent response formats.

Prefer REST conventions.

Keep endpoints predictable.

---

# Best Practices

Before writing code:

* search for existing services
* search for existing models
* search for existing utilities

Extend existing implementations whenever possible.

---

# Goal

Backend code should remain modular, testable, and capable of supporting future AI processing pipelines without large architectural changes.
