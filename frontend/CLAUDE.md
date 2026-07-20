# CLAUDE.md

# Frontend Development Guide

Tech Stack

* Next.js 16
* TypeScript
* React
* Tailwind CSS
* shadcn/ui
* App Router

---

# Responsibilities

The frontend is responsible for:

* User interface
* Authentication state
* API communication
* Form validation
* Client-side state
* Navigation
* Media editing experience

The frontend is **not** responsible for business logic or database rules.

---

# Architecture

Prefer this flow:

```
Page
    ↓
View
    ↓
Components
    ↓
Hooks
    ↓
API Client
```

Business logic should remain minimal.

---

# Component Guidelines

Prefer:

* reusable components
* composition
* small files
* descriptive props

Avoid:

* deeply nested components
* duplicated UI
* unnecessary prop drilling

---

# State Management

Prefer:

* local state first
* shared hooks second
* context only when necessary

Avoid creating global state for page-specific data.

---

# API Usage

Always use the existing API client.

Do not:

* hardcode endpoints
* duplicate API calls
* bypass authentication helpers

---

# Styling

Use:

* Tailwind utilities
* existing design system
* existing spacing
* existing typography

Prefer extending current components before creating new ones.

---

# File Organization

Keep:

* hooks inside hooks/
* reusable UI inside components/
* page logic inside views/
* utilities inside lib/

Avoid mixing responsibilities.

---

# Before Creating Something New

Search for:

* existing component
* existing hook
* existing utility
* existing API function

Reuse before creating.

---

# Coding Style

Prefer:

* functional components
* early returns
* clear naming
* small functions

Avoid unnecessary memoization or premature optimization.

---

# Goal

Every UI change should feel like it was written by the original author of the project.
