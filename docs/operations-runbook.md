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

- `CI / Verify (Node 20)`
- `CI / Verify (Node 22)`
- `CI / Verify (Postgres strict health)`

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
