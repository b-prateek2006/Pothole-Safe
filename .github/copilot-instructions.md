# PotholeSafe — Project Guidelines

## Overview

Civic pothole reporting web app. Citizens upload pothole photos with GPS location, the system verifies images via an external API, stores reports in MySQL, displays them on an interactive map, and admins manage reports through a dashboard.

**Monorepo structure:**
- `frontend/` — Vanilla HTML/CSS/JS (no framework, no bundler)
- `backend/` — Node.js + Express REST API
- `database/` — MySQL schema and seed scripts

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla JS, Leaflet.js + OpenStreetMap | No build step; load scripts via `<script>` tags |
| Backend | Node.js 18+, Express, Sequelize ORM | API at `http://localhost:3000/api` |
| Database | MySQL 8 | Schema in `database/schema.sql` |
| Image Verification | Google Cloud Vision API (mock fallback) | Configurable via `.env` |
| File Uploads | Multer → local `uploads/` directory | Served via Express static middleware |

## Code Style

### Frontend (`frontend/`)
- **No framework** — vanilla JS with `document.addEventListener('DOMContentLoaded', ...)` pattern
- API helpers centralized in `js/main.js` (`apiGet`, `apiPost`, `apiPostForm`, `apiPut`)
- Each page has its own `<page>.js` file loaded after `main.js`
- CSS variables in `:root` for theming (`--primary`, `--success`, `--danger`, `--warning`)
- camelCase for JS variables/functions, kebab-case for CSS classes
- No external CSS framework — custom styles in `css/styles.css`

### Backend (`backend/`)
- Express route/controller/service pattern: `routes/` → `controllers/` → `services/`
- Sequelize models in `models/`, database config in `config/database.js`
- Environment variables via `dotenv` (`.env` file, never committed)
- Middleware in `middleware/` (auth, error handling)
- File uploads handled by Multer in `services/fileStorageService.js`

## API Endpoints

```
POST   /api/reports              — Submit report (multipart: image + lat/lng + description)
GET    /api/reports              — List verified reports (for map)
GET    /api/reports/:id          — Single report detail
GET    /api/reports/status/:s    — Filter by PENDING/VERIFIED/REJECTED
POST   /api/admin/login          — Admin authentication
POST   /api/admin/logout         — Destroy admin session
GET    /api/admin/reports         — All reports (admin, auth required)
PUT    /api/admin/reports/:id/verify  — Mark verified (auth required)
PUT    /api/admin/reports/:id/reject  — Mark rejected (auth required)
GET    /api/admin/stats           — Dashboard counts (auth required)
GET    /api/files/:filename       — Serve uploaded images
```

## Build and Test

```bash
# Frontend — no build step, open HTML files directly or serve via backend
# Backend
cd backend
npm install
npm start          # Starts Express on port 3000

# Database
mysql -u root -p < database/schema.sql
mysql -u root -p potholesafe < database/seed.sql
```

## Conventions

- **Report statuses:** `PENDING`, `VERIFIED`, `REJECTED` (uppercase strings, used in both DB and API responses)
- **API responses use camelCase** field names: `imagePath`, `verificationStatus`, `confidenceScore`, `createdAt`
- **Frontend expects these exact field names** from API JSON responses
- **Image validation:** max 10MB, image/* MIME types only (enforced both client and server)
- **Geolocation default center:** Bangalore (12.97°N, 77.59°E) — used when user location unavailable
- **Admin auth:** session-based via `sessionStorage` on frontend, `express-session` on backend
- **No user authentication** for reporters — anonymous submissions by design

## Pitfalls

- The frontend fetches from `localhost:3000`; backend must enable CORS
- Leaflet.js and MarkerCluster are loaded from CDN in `map.html` — no npm install needed for frontend
- `assets/logo.svg` exists — reference it in nav bars as `assets/logo.svg`
- Frontend fetch calls must include `credentials: 'include'` for session cookies to work cross-origin
- Seed data references sample image files (sample1.jpg–sample5.jpg) that don't exist in the uploads directory

---

## Progress Tracker

**Last updated:** 2026-03-16

### Phase 1 — Database & Backend Foundation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Database schema (`database/schema.sql` + `database/seed.sql`) | ✅ Done | Two tables: `pothole_reports` (with ENUM status) and `admin_users`. Seed includes 1 admin + 5 sample reports. |
| 2 | Node.js project setup (`backend/package.json`, `server.js`) | ✅ Done | Express, Sequelize, mysql2, multer, cors, dotenv, bcryptjs, express-session all installed. Entry point: `server.js`. Legacy `pom.xml` removed. |
| 3 | Sequelize models (`models/PotholeReport.js`, `models/AdminUser.js`, `config/database.js`) | ✅ Done | Models match SQL schema exactly. `models/index.js` re-exports everything. `config/database.js` reads from `.env`. |
| 4 | Service layer (`services/potholeService.js`, `services/imageVerificationService.js`, `services/fileStorageService.js`) | ✅ Done | `potholeService.js` — full CRUD + stats. `imageVerificationService.js` — mock mode (default) + Google Vision mode. `fileStorageService.js` — Multer with 10MB limit, image-only filter, auto-creates `uploads/`. |
| 5 | REST routes + controllers (`routes/`, `controllers/`) | ✅ Done | `reportRoutes.js` + `reportController.js` (public endpoints). `adminRoutes.js` + `adminController.js` (admin endpoints). `fileRoutes.js` (serves uploads with path-traversal protection). |
| 6 | Middleware (CORS, session auth, error handling) | ✅ Done | `requireAdmin` applied to all protected admin routes. `errorHandler.js` handles Multer, CORS, and Sequelize errors. Helmet for security headers, morgan for logging, express-rate-limit for brute-force protection. Session store backed by MySQL via connect-session-sequelize. |

### Phase 2 — Frontend Implementation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7 | Report page (`report.html` + `report.js`) | ✅ Done | Drag-and-drop upload with preview, browser geolocation auto-detect, manual fallback, client-side validation (type + size), POST via FormData, redirects to status page on success. |
| 8 | Map page (`map.html` + `map.js`) | ✅ Done | Interactive Leaflet.js map with OpenStreetMap tiles, MarkerCluster plugin, red circle markers with image/status/confidence popups, user geolocation centering. |
| 9 | Admin page (`admin.html` + `admin.js`) | ✅ Done | Login form, stats dashboard (4 cards), reports table with thumbnails + status badges + verify/reject buttons, status filter dropdown, logout button, session-expired handling with auto-redirect to login. |
| 10 | Status page (`status.html` + `status.js`) | ✅ Done | Reads `?id=` from URL, fetches report, displays status icon + message + image + location + confidence + date. Handles not-found errors. |
| 11 | Homepage & nav (`index.html` + `main.js`) | ✅ Done | Landing page with CTA. `main.js` provides configurable `API_BASE`, nav active-state highlighting, API helpers with `credentials: 'include'` and `parseErrorResponse()` for server error messages. `assets/logo.svg` created. |
| 12 | Responsive CSS (`css/styles.css`) | ✅ Done | 474 lines. CSS variables for theming, all page layouts styled, mobile breakpoint at 768px (2-column stats, stacked inputs, smaller table text). |

### Phase 3 — Integration & Polish

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | Image verification integration | ✅ Done | Mock mode returns random 60–95% confidence. Google Vision mode implemented (reads base64, calls label detection, matches against pothole keywords). Mode controlled by `VERIFICATION_MODE` env var. |
| 14 | Error handling | ✅ Done | Backend: `errorHandler.js` handles Multer, CORS, and Sequelize-specific errors with appropriate status codes. Structured JSON logging in production. Controllers have try/catch. Input validation on report submission (lat/lng range, description sanitization via `xss`, 500 char cap). Orphan file cleanup on failed submissions. Frontend: form validation on report page, server error messages parsed in all API helpers, session-expired handling in admin. |
| 15 | Responsive design | ✅ Done | Mobile-friendly layout with media queries. Touch-friendly buttons and inputs. Map is full-viewport. |

---

## Known Bugs & Issues

| Priority | Issue | Location | Description |
|----------|-------|----------|-------------|
| **LOW** | Seed image files missing | `database/seed.sql` | References `sample1.jpg`–`sample5.jpg` in image_path but no sample images exist in `uploads/`. |
| **LOW** | No test suite | `backend/package.json` | No test framework, no test files, no CI pipeline. |

---

## Remaining Work — Completion Plan

### Sprint 1: Fix Auth & Security (Critical) — ✅ COMPLETED

1. ~~Apply `requireAdmin` middleware to admin routes~~ ✅
2. ~~Add `credentials: 'include'` to all frontend fetch calls~~ ✅
3. ~~Configure CORS with explicit origin whitelist~~ ✅
4. ~~Add admin logout~~ ✅
5. ~~Session regeneration on login (prevent session fixation)~~ ✅
6. ~~Add Helmet for security headers~~ ✅
7. ~~Add rate limiting (login + report submission)~~ ✅
8. ~~Replace MemoryStore with MySQL-backed session store~~ ✅
9. ~~Environment-aware session cookies (secure in prod)~~ ✅

### Sprint 2: Input Validation & Error Handling — ✅ COMPLETED

10. ~~Validate lat/lng ranges, sanitize description with XSS protection~~ ✅
11. ~~Clean up orphaned uploads on failed submissions~~ ✅
12. ~~Enhanced error handler (Sequelize errors, structured logging, CORS errors)~~ ✅
13. ~~Frontend: parse server error messages instead of generic status codes~~ ✅
14. ~~Admin dashboard: session-expired handling with auto-redirect~~ ✅
15. ~~Production startup validation (SESSION_SECRET, ALLOWED_ORIGINS)~~ ✅
16. ~~Environment config: `.env.example` template with new variables~~ ✅

### Sprint 3: Testing & Remaining Polish

17. **Add sample images for seed data**
    - Include 5 sample pothole images in a `database/samples/` directory
    - Update seed script or add a setup script that copies them to `uploads/`

18. **Testing**
    - Add a basic test framework (e.g., Jest + supertest)
    - Write integration tests for core API endpoints
    - Write unit tests for `imageVerificationService` and `potholeService`

### Sprint 4: Optional Enhancements

19. **Report search/pagination** — Add `?page=&limit=` query params to report listing endpoints
20. **Image thumbnails** — Generate smaller thumbnails on upload for faster map popup loading
21. **Export reports** — CSV/JSON export endpoint for admin
22. **Email notifications** — Notify admin when new reports are submitted
23. **Reverse geocoding** — Show human-readable address instead of raw lat/lng coordinates

---

## Session Log

| Date | Summary |
|------|---------|
| 2026-03-16 | Initial progress audit. Phase 1 and Phase 2 are fully implemented. Two critical bugs identified: (1) admin auth middleware not applied to routes, (2) cross-origin cookies not sent from frontend. Phase 3 mostly done except error handling gaps. Created completion plan with 4 sprints. |
| 2026-03-16 | Executed Sprints 1 & 2 fully. Fixed: admin auth (requireAdmin wired, session regeneration, logout endpoint), CORS whitelist, credentials:include on all fetch calls, Helmet security headers, morgan logging, rate limiting (login + reports), MySQL session store, input validation (lat/lng ranges, XSS sanitization, description cap), orphan file cleanup, enhanced error handler (Sequelize/CORS errors, structured logging), frontend session-expired handling, .env.example template. All 3 phases + hardening now complete. Remaining: test suite, seed sample images, optional enhancements. |
