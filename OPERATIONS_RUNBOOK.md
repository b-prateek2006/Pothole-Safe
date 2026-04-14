# PotholeSafe Operations Runbook

This runbook defines repeatable production operations for backend and frontend release safety.

## 1. Pre-Deployment Checks

1. Confirm local quality checks pass:
   - `cd backend`
   - `npm run lint`
   - `npm run test:ci`
   - `npm audit --omit=dev --audit-level=high`
2. Confirm pending migrations:
   - `npm run migrate:status`
3. Confirm no hardcoded secrets in code or docs.
4. Confirm target env vars are configured in Railway and Vercel.

## 2. Standard Deployment Procedure

1. Push validated commit to `main`.
2. Deploy backend service on Railway.
3. If schema changes are included:
   - Open Railway shell
   - `cd backend`
   - `npm run migrate`
4. Verify backend readiness:
   - `GET /api/health/live`
   - `GET /api/health/ready`
5. Deploy frontend on Vercel.
6. Smoke test critical flows:
   - Report submission
   - Admin login
   - Verify/reject actions
   - Status lookup

## 3. Rollback Procedure

1. Assess impact and capture timeline in incident notes.
2. Roll back application version first (Railway/Vercel previous deploy).
3. Schema rollback policy:
   - Rollback is blocked by default.
   - Set `ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true` only if rollback is unavoidable.
   - Run `npm run migrate:undo` for one step.
   - Immediately reset `ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=false`.
4. Validate:
   - `GET /api/health/ready`
   - Core flow smoke tests.

## 4. Incident Triage Quick Path

### A. Backend not ready

1. Check Railway logs for startup errors.
2. Verify DB credentials and network access.
3. Check migration state:
   - `cd backend`
   - `npm run migrate:status`

### B. Admin login failures

1. Verify session settings (`SESSION_SECRET`, `TRUST_PROXY`, CORS origins).
2. Check audit logs endpoint:
   - `GET /api/admin/audit-logs`
3. Confirm cookie handling in browser for cross-origin setup.

### C. Frontend API errors

1. Verify `frontend/js/runtime-config.js` API base.
2. Check CORS `ALLOWED_ORIGINS` backend variable.
3. Inspect frontend telemetry events in DB (`frontend_telemetry_events`).

### D. Upload failures

1. Check `MAX_FILE_SIZE` and MIME validation.
2. Confirm `uploads/` path exists and is writable.
3. Verify `/api/files/:filename` accessibility.

## 5. Monthly Operations Drill

1. Backup drill:
   - `cd backend`
   - `npm run db:backup`
2. Restore drill in non-production only:
   - Set `ALLOW_DB_RESTORE=true`
   - `npm run db:restore -- <backup-file.sql>`
   - Reset `ALLOW_DB_RESTORE=false`
3. Retention purge drill:
   - `npm run reports:purge -- 90`
4. Audit trail verification:
   - Perform one admin action and confirm row in `admin_audit_logs`.
5. Telemetry verification:
   - Trigger a frontend error and confirm row in `frontend_telemetry_events`.

## 6. Monitoring Endpoints

- Liveness: `/api/health/live`
- Readiness: `/api/health/ready`
- Metrics (optional): `/api/metrics` when `ENABLE_METRICS=true`

## 7. Rotation Policy

1. Rotate `SESSION_SECRET` every 90 days or after suspected exposure.
2. Rotate admin credentials after incident handling and at least quarterly.
3. Remove temporary bootstrap credentials from environment after use.
