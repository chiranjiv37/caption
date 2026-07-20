# Database Documentation

# Overview

Captions Studio uses PostgreSQL as the primary relational database.

SQLAlchemy Async is used as the ORM.

Alembic manages schema migrations.

---

# Database Responsibilities

Store:

* users
* projects
* series
* episodes
* speakers
* segments
* translations
* assets
* permissions

---

# Relationship Overview

```text
User

↓

Projects

↓

Segments

↓

Translations
```

Series may contain multiple projects.

Projects may contain multiple speakers.

Assets belong to projects.

---

# Naming Conventions

Tables

* plural nouns

Columns

* snake_case

Primary Keys

* id

Foreign Keys

* <table>_id

Timestamps

* created_at
* updated_at

---

# Models

Each table should have:

* ORM model
* Pydantic schema
* service methods

Avoid exposing ORM objects directly.

---

# Queries

Prefer SQLAlchemy ORM.

Keep queries inside services.

Reuse query helpers.

Avoid duplicated filtering logic.

---

# Transactions

Use transactions whenever multiple database operations must succeed together.

Rollback on failure.

---

# Migrations

Use Alembic for all schema changes.

Never modify production databases manually.

Migration workflow:

```text
Modify Model

↓

Generate Migration

↓

Review Migration

↓

Apply Migration
```

Always review generated migrations before applying them.

---

# Performance

Prefer:

* indexes on searchable columns
* pagination
* eager loading
* efficient filtering

Avoid:

* SELECT *
* loading unnecessary relationships
* repeated queries inside loops

---

# Soft Deletes

If soft delete is implemented:

* filter deleted records by default
* restore through dedicated endpoints
* avoid permanent deletion unless necessary

---

# Future Expansion

Database should support future modules:

* AI dubbing
* multilingual captions
* media processing
* billing
* collaboration
* analytics

Design new tables with extensibility in mind.

---

# Goal

The database should remain normalized, scalable, and easy to evolve as Captions Studio grows.
