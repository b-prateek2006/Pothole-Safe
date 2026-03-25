# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PotholeSafe is a civic pothole reporting web app. Citizens upload pothole photos with GPS location, images are verified via an external API, reports are stored in MySQL, displayed on an interactive map, and admins manage reports through a dashboard.

**Stack:** Vanilla JS frontend (no framework/bundler) + Node.js/Express backend + MySQL + Sequelize ORM

## Development Commands

```bash
# Backend
cd backend
npm install
npm start              # Express on port 3000
npm run dev            # Watch mode (Node.js --watch)

# Database setup
mysql -u root -p < database/schema.sql
mysql -u root -p potholesafe < database/seed.sql

# Frontend
# No build step — serve HTML files via Live Server on port 5500 or similar
# CORS configured for localhost:5500 and 5501 by default
```

## Architecture

```
frontend/              Vanilla HTML/CSS/JS, Leaflet.js maps
├── js/main.js         API helpers (apiGet, apiPost, apiPostForm, apiPut)
├── js/<page>.js       Page-specific logic loaded after main.js
└── css/styles.css     CSS variables in :root for theming

backend/               Express REST API at /api
├── routes/            HTTP route definitions
├── controllers/       Request handling, calls services
├── services/          Business logic (potholeService, imageVerificationService, fileStorageService)
├── models/            Sequelize models (PotholeReport, AdminUser)
├── middleware/        auth.js (requireAdmin), errorHandler.js
└── config/            database.js reads from .env

database/
├── schema.sql         Tables: pothole_reports (ENUM status), admin_users
└── seed.sql           Sample data
```

## Key Conventions

**Report statuses:** `PENDING`, `VERIFIED`, `REJECTED` (uppercase strings)

**API field names:** camelCase (`imagePath`, `verificationStatus`, `confidenceScore`, `createdAt`)

**Frontend patterns:**
- `document.addEventListener('DOMContentLoaded', ...)` initialization
- All fetch calls use `credentials: 'include'` for session cookies
- camelCase JS, kebab-case CSS classes
- CSS variables: `--primary`, `--success`, `--danger`, `--warning`

**Backend patterns:**
- Route → Controller → Service layering
- Multer for uploads (10MB max, image/* only) → `uploads/` directory
- XSS sanitization via `xss` package on user input
- Session-based admin auth (express-session + MySQL store)
- Anonymous submissions for reporters (no user auth)

**Image verification:** `VERIFICATION_MODE=mock` (default) returns random 60-95% confidence; `google` mode uses Cloud Vision API

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Required for production:
- `SESSION_SECRET` (32+ chars)
- `ALLOWED_ORIGINS` (comma-separated)
- `DB_*` credentials

## API Endpoints

```
POST   /api/reports              Multipart: image + lat/lng + description
GET    /api/reports              List verified reports
GET    /api/reports/:id          Single report
GET    /api/reports/status/:s    Filter by status
POST   /api/admin/login          Auth
POST   /api/admin/logout         Destroy session
GET    /api/admin/reports        All reports (auth required)
PUT    /api/admin/reports/:id/verify|reject
GET    /api/admin/stats          Dashboard counts
GET    /api/files/:filename      Serve uploads
```

## Pitfalls

- Frontend fetches from localhost:3000; Live Server default is 5500
- Leaflet/MarkerCluster loaded via CDN, no npm install for frontend
- Default map center: Bangalore (12.97°N, 77.59°E)
- Seed data references sample1.jpg–sample5.jpg that don't exist in uploads/
- No test suite currently exists

---

## Token Optimization Guidelines

**Context management:**
- Read only files directly relevant to the current task
- Use targeted Glob/Grep patterns instead of reading entire directories
- When exploring, prefer the Explore agent for broad searches

**Efficient edits:**
- Use Edit tool for surgical changes rather than rewriting whole files
- Group related changes together to minimize tool calls
- State what you're changing before doing it to reduce back-and-forth

**Memory usage:**
- Reference this file for project conventions instead of re-reading copilot-instructions.md
- Key paths: `backend/server.js` (entry), `frontend/js/main.js` (API helpers), `backend/services/` (business logic)
- For API questions, check routes/ before controllers/

**Parallelization:**
- Independent file reads can be batched in single tool call
- Run lint/test/build checks in parallel when validating changes
