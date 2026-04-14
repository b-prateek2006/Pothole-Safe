# Deployment Guide (Railway Backend + Vercel Frontend)

## Target Architecture

```
Frontend (Vercel static hosting) -> Backend API (Railway) -> MySQL (Railway)
```

This guide is for a quick production launch with safe defaults and no destructive DB reset.

For ongoing release, rollback, and incident handling, use [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md).

## 1. Prerequisites

1. Repository pushed to GitHub.
2. Railway account connected to GitHub.
3. Vercel account connected to GitHub.
4. A strong session secret and admin password generated locally.

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Deploy Backend to Railway

1. Create a new Railway project from this repository.
2. Add a MySQL service in the same Railway project.
3. In backend service variables, configure:

```env
PORT=3000
NODE_ENV=production

DB_HOST=<railway_mysql_host>
DB_PORT=<railway_mysql_port>
DB_NAME=<railway_mysql_database>
DB_USER=<railway_mysql_user>
DB_PASSWORD=<railway_mysql_password>
DB_SSL=true

UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
REQUEST_BODY_LIMIT=1mb

VERIFICATION_MODE=mock
CONFIDENCE_THRESHOLD=0.6

SESSION_SECRET=<64_char_random_secret>
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5500
TRUST_PROXY=true

DB_LOGGING=false
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
DB_RETRY_MAX=3

INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=<temporary_strong_admin_password>

ENABLE_METRICS=false
METRICS_TOKEN=<optional_bearer_token>
ENABLE_FRONTEND_TELEMETRY=true

ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=false
ALLOW_DB_RESTORE=false
```

Notes:
1. Do not hardcode secrets in source files.
2. `ALLOWED_ORIGINS` should contain frontend origins only.
3. Keep localhost origin only if you still test from local frontend.

## 3. Initialize Database (One Time)

After first backend deploy succeeds:

1. Open Railway service shell.
2. Run:

```bash
cd backend
npm run db:init
```

What this does:
1. Connects to DB.
2. Applies all pending migrations (idempotent change control).
3. Creates initial admin user only if it does not already exist.

After initialization, remove `INIT_ADMIN_PASSWORD` from Railway variables.

For future schema updates, run:

```bash
cd backend
npm run migrate
```

Rollback policy:
1. Rollbacks are blocked by default.
2. To allow one rollback intentionally, set `ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true` and run `npm run migrate:undo`.
3. Immediately set it back to `false` after the operation.

## 4. Configure Backend Health Check

Set Railway health check path to:

```
/api/health/ready
```

Available endpoints:
1. `/api/health/live` - process liveness.
2. `/api/health/ready` - readiness (verifies DB connectivity).
3. `/api/health` - alias for readiness.

Metrics endpoint (optional):
1. Enable with `ENABLE_METRICS=true`.
2. Use `METRICS_TOKEN` for bearer-token protection.
3. Scrape `/api/metrics` for Prometheus-compatible metrics.

## 5. Deploy Frontend to Vercel

1. Create a new Vercel project from the same repository.
2. Set Root Directory to `frontend`.
3. No build step is required (vanilla HTML/CSS/JS).

Set API base once in [frontend/js/runtime-config.js](frontend/js/runtime-config.js):

```js
window.POTHOLESAFE_API_BASE = 'https://your-backend.railway.app/api';
```

If frontend and backend are served from the same origin, leave it empty and it will use `/api` automatically.

## 6. Post-Deploy Verification Checklist

1. Open frontend URL and submit a report with image upload.
2. Confirm backend receives `POST /api/reports` successfully.
3. Log in at `/admin.html` with the initialized admin account.
4. Confirm admin stats and reports load without CORS/session issues.
5. Verify image URLs load from `/api/files/<filename>`.
6. Confirm readiness endpoint responds with `status: ready`.
7. Perform one verify/reject action and confirm `/api/admin/audit-logs` records the event.
8. Soft-delete one report, confirm it disappears from default listing, then restore it via `/api/admin/reports/:id/restore`.
9. Trigger a frontend error in browser devtools and confirm `POST /api/telemetry/frontend` returns 202.

## 7. Security Follow-Up (Recommended)

1. Rotate admin credentials immediately after first login.
2. Rotate `SESSION_SECRET` if it was exposed in any logs.
3. Remove localhost origins from `ALLOWED_ORIGINS` when no longer needed.

## 8. Backup and Restore Runbook

Create a backup:

```bash
cd backend
npm run db:backup
```

Restore a backup (blocked by default):

```bash
cd backend
npm run db:restore -- ../database/backups/<backup-file>.sql
```

Before running restore, temporarily set `ALLOW_DB_RESTORE=true` in your environment.

Restore safety policy:
1. Use restore only in staging unless production restore is required for incident recovery.
2. Always take a fresh backup before restoring.
3. Set `ALLOW_DB_RESTORE=false` again immediately after restore.

Retention purge (recommended scheduled task):

```bash
cd backend
npm run reports:purge -- 90
```

This permanently removes soft-deleted reports and their image files older than the specified number of days.
