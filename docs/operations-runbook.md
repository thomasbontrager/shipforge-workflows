# Operations Runbook

## Purpose

This runbook defines how to verify, deploy, and troubleshoot this repository in a repeatable way.

## Prerequisites

- Node.js 20 or 22
- npm
- PostgreSQL (for strict health checks)
- GitHub CLI (`gh`) authenticated for branch protection automation

## Local validation

Run the full validation pipeline:

```bash
npm run verify:all
```

What this covers:

- `npm run lint`
- `npm run build`
- starts app on port `3100`
- `npm run smoke:test`
- `npm run branch-protection:check`

Run environment guardrails in CI mode:

```bash
CHECK_ENV_MODE=ci DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder NEXTAUTH_URL=http://127.0.0.1:3000 NEXTAUTH_SECRET=ci-secret npm run env:check
```

Run auth end-to-end tests:

```bash
npm run test:e2e
```

Skip branch protection check when needed:

```bash
VERIFY_SKIP_BRANCH_PROTECTION=true npm run verify:all
```

## Smoke test modes

Baseline mode (works without a configured DB):

```bash
npm run smoke:test
```

Strict mode (requires healthy DB path):

```bash
SMOKE_BASE_URL=http://127.0.0.1:3100 SMOKE_STRICT_HEALTH_OK=true npm run smoke:test
```

## Health endpoint behavior

Endpoint: `/health`

- Returns `200` when DB check succeeds.
- Returns `503` when DB check fails.
- Uses a short timeout and opens a temporary circuit after consecutive DB failures.
- Includes `x-request-id` on responses for correlation.

## Branch protection operations

Apply baseline branch protection:

```bash
npm run branch-protection:setup
```

Verify branch protection drift:

```bash
npm run branch-protection:check
npm run branch-protection:check:json
```

## CI expectations

Required checks for `main`:

- `Verify (Node 20)`
- `Verify (Node 22)`
- `Verify (Postgres strict health)`

## Alerting

Scheduled health monitoring is configured in `.github/workflows/health-monitor.yml`.

- Set `HEALTHCHECK_URL` repository secret to the production health URL.
- Workflow runs every 30 minutes and opens or updates an alert issue when health is not `200`.

## Pre-deploy DB safety

Run before production deploy:

```bash
BACKUP_CONFIRMED=true DATABASE_URL=postgresql://... npm run db:safety-check
```

This command checks that backup confirmation is explicit and validates Prisma migration status.

## Incident triage

1. Run `npm run verify:all` locally.
2. If smoke tests fail, inspect route-specific errors and request headers.
3. If health fails in strict mode, validate `DATABASE_URL` and DB availability.
4. If branch protection check fails, run `npm run branch-protection:setup` and re-check.
5. Re-run `npm run verify:all` before merge.

## Rollback guidance

1. Revert the offending commit on `main`.
2. Re-run CI and confirm all required checks are green.
3. Confirm `/health` status and smoke tests pass in the target environment.
