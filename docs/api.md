# API Documentation

# Overview

The frontend communicates with the backend exclusively through the REST API.

No business logic should exist in the frontend.

Authentication, authorization, validation, and database operations are handled by the backend.

---

# API Principles

Every endpoint should:

* validate input
* authenticate user
* authorize access
* execute business logic
* return a consistent response

---

# URL Convention

```text
/api/v1/<resource>
```

Examples

```
/api/v1/auth
/api/v1/projects
/api/v1/assets
/api/v1/series
```

---

# Authentication Flow

```text
User Login
      │
      ▼
Access Token + Refresh Token
      │
      ▼
Frontend stores authentication
      │
      ▼
Authenticated API Requests
      │
      ▼
401
      │
      ▼
Refresh Token
      │
      ▼
Retry Original Request
```

Authentication refresh should happen automatically through the centralized API client.

---

# Response Format

Successful responses should be predictable.

Example

```json
{
    "data": {},
    "message": "Success"
}
```

Validation errors should return appropriate HTTP status codes.

---

# Pagination

List endpoints should support

* page
* per_page
* sorting
* filtering
* searching

Never return thousands of records in one request.

---

# Validation

All request validation belongs in Pydantic schemas.

Never trust frontend validation.

---

# Authorization

Always verify

* ownership
* permissions
* authenticated user

before returning protected resources.

---

# Error Handling

Use appropriate HTTP status codes.

Examples

```
400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error
```

Avoid exposing internal implementation details.

---

# Versioning

All public endpoints should remain under

```
/api/v1/
```

Future breaking changes should create

```
/api/v2/
```

instead of modifying existing contracts.

---

# API Philosophy

Stable APIs reduce frontend complexity.

When changing an endpoint, consider backward compatibility first.
