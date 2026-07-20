# Architecture

# Overview

Captions Studio is a full-stack web application for AI-powered video caption editing, transcription, translation, dubbing, and media management.

The project follows a clean separation between presentation, business logic, and persistence.

```
Browser
    │
    ▼
Next.js Frontend
    │
REST API
    │
    ▼
FastAPI Backend
    │
Service Layer
    │
    ▼
PostgreSQL
```

---

# High-Level Components

## Frontend

Responsibilities:

* Authentication
* User Interface
* Video Editing
* Timeline Editing
* API Communication
* State Management

The frontend should never contain business rules.

---

## Backend

Responsibilities:

* Authentication
* Authorization
* Validation
* Business Logic
* Database Access
* Background Processing

All business rules should live here.

---

## Database

Stores:

* Users
* Projects
* Caption Segments
* Speakers
* Series
* Episodes
* Assets
* Translation Data

The database is accessed only through SQLAlchemy models and services.

---

# Request Flow

Every request should follow:

```
HTTP Request
    │
    ▼
Router
    │
Validation
    │
Service
    │
Model
    │
Database
    │
Response Schema
    │
HTTP Response
```

---

# Frontend Architecture

Preferred flow:

```
Page
    │
View
    │
Component
    │
Hook
    │
API Client
```

Components should remain presentation focused.

Business logic belongs in hooks or backend services.

---

# Backend Architecture

Backend follows a layered architecture.

```
Router

↓

Service

↓

Repository / ORM

↓

Database
```

Responsibilities:

Router

* HTTP
* Authentication
* Validation

Service

* Business rules
* Permissions
* Transactions

Model

* Persistence

Schema

* API contract

---

# Guiding Principles

## Separation of Concerns

Each layer should have one responsibility.

Avoid mixing:

* UI
* Business Logic
* Database Logic

---

## Consistency

Prefer existing project patterns over introducing new ones.

---

## Reuse

Before writing new code, search for:

* component
* hook
* service
* utility
* model

---

## Maintainability

Readable code is preferred over clever code.

Small focused functions are preferred over large generic functions.

---

# Future Architecture

Future integrations may include:

* Whisper transcription
* Translation providers
* AI dubbing
* FFmpeg processing
* Queue workers
* Redis
* Object storage

These integrations should remain isolated from the core application whenever possible.
