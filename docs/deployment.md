# Deployment Guide

# Production Architecture

```
Browser
     │
     ▼
Cloudflare
     │
     ▼
Nginx
     │
     ▼
FastAPI
     │
     ▼
PostgreSQL
```

Optional services

* Redis
* Celery
* Object Storage

---

# Environment Variables

Separate

* Development
* Staging
* Production

Never commit secrets.

---

# Backend

Run using a production ASGI server.

Example

```
gunicorn

or

uvicorn workers
```

Development mode should never be used in production.

---

# Reverse Proxy

Nginx should

* terminate SSL
* proxy API
* serve frontend
* enable compression
* support large uploads

---

# Database

Always

* backup before migrations
* verify migrations
* monitor storage

Never edit production schema manually.

---

# Logging

Log

* startup
* errors
* authentication failures
* background jobs

Avoid logging secrets.

---

# Security

Always

* HTTPS
* secure cookies
* strong JWT secrets
* CORS restrictions
* rate limiting

Never expose internal services directly.

---

# Monitoring

Monitor

* CPU
* RAM
* disk
* database
* API latency
* queue length

---

# Scaling

Scale independently

Frontend

Backend

Workers

Database

Avoid coupling all services together.

---

# Production Checklist

✓ Environment variables

✓ SSL

✓ Database backup

✓ Logging

✓ Monitoring

✓ Rate limiting

✓ File storage

✓ Reverse proxy

✓ Secrets configured

Deployment should always be repeatable.
