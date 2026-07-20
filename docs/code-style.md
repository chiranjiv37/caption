# Frontend Documentation

# Overview

The frontend is a Next.js 16 application responsible for the user interface of Captions Studio.

Main responsibilities:

* Authentication
* Project management
* Caption editor
* Timeline interaction
* Asset management
* API communication

Business rules should remain in the backend.

---

# Technology Stack

Framework

* Next.js App Router
* React
* TypeScript

UI

* Tailwind CSS
* shadcn/ui
* Radix UI

State

* React Context
* React Hooks

Networking

* Centralized API client

---

# Folder Structure

```text
frontend/

app/
components/
hooks/
views/
lib/
public/
```

---

# App Router

Use the App Router for routing.

Layouts should contain shared UI.

Pages should remain lightweight.

---

# Components

Components should:

* be reusable
* remain presentation focused
* receive data through props

Avoid embedding API logic inside UI components.

---

# Views

Views assemble multiple components into complete pages.

Typical flow:

```text
Page

↓

View

↓

Components
```

Views should avoid direct HTTP requests.

---

# Hooks

Hooks contain reusable frontend logic.

Typical responsibilities:

* API requests
* state synchronization
* pagination
* authentication
* caching

When creating new logic, prefer extending an existing hook before creating a new one.

---

# API Client

All HTTP communication should use the centralized API layer.

Avoid:

* fetch scattered across components
* duplicated endpoint URLs
* duplicated authentication logic

Authentication, refresh handling and error handling should remain centralized.

---

# Forms

Forms should:

* validate before submission
* display useful errors
* reuse existing components

Avoid duplicate validation logic.

---

# State Management

Prefer:

Local State

↓

Custom Hooks

↓

Context

↓

Global State

Only promote state when multiple pages require it.

---

# Styling

Use:

* Tailwind utilities
* design system spacing
* existing typography
* reusable UI components

Avoid inline styles unless absolutely necessary.

---

# File Uploads

Upload flow:

```text
User

↓

Frontend Validation

↓

Backend Upload Endpoint

↓

Storage

↓

Asset Registration
```

Frontend should not contain upload business rules.

---

# Caption Editor

The editor should remain responsive.

Heavy processing belongs in backend services.

Frontend responsibilities include:

* timeline rendering
* editing
* playback synchronization
* user interactions

---

# Best Practices

Always:

* reuse components
* reuse hooks
* keep pages small
* use descriptive names

Avoid:

* duplicated JSX
* duplicated API calls
* deeply nested components
* page-specific global state

---

# Goal

Frontend code should remain predictable, reusable, and focused on delivering a smooth editing experience.
