# shipforge-workflows
GitHub Actions for Shipforge auto-deploy

## Local checks

Run lint and build:

```bash
npm run lint
npm run build
```

Run environment guardrails in CI mode:

```bash
CHECK_ENV_MODE=ci DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder NEXTAUTH_URL=http://127.0.0.1:3000 NEXTAUTH_SECRET=ci-secret npm run env:check
```

Run full verification in one command (lint, build, smoke, branch protection check):

```bash
npm run verify:all
```

Skip branch protection check when needed:

```bash
VERIFY_SKIP_BRANCH_PROTECTION=true npm run verify:all
```

Run smoke tests against a running app (defaults to http://127.0.0.1:3000):

```bash
npm run smoke:test
```

Run auth E2E tests (Playwright):

```bash
npm run test:e2e
```

Set a custom base URL when needed:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke:test
```

Require `/health` to be fully healthy (200) in environments where `DATABASE_URL` is configured:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 SMOKE_STRICT_HEALTH_OK=true npm run smoke:test
```

## Branch protection

Recommended GitHub branch protection settings and required status checks are documented in [.github/branch-protection.md](.github/branch-protection.md).

Required check contexts should be:

- `Verify (Node 20)`
- `Verify (Node 22)`
- `Verify (Postgres strict health)`

Apply them automatically with:

```powershell
./scripts/setup-branch-protection.ps1 -Owner thomasbontrager -Repo shipforge-workflows -Branch main
```

Or with npm shortcut:

```bash
npm run branch-protection:setup
```

Verify drift from the expected baseline:

```powershell
./scripts/check-branch-protection.ps1 -Owner thomasbontrager -Repo shipforge-workflows -Branch main
```

Or with npm shortcuts:

```bash
npm run branch-protection:check
npm run branch-protection:check:json
```

## Operations docs

- [Operations runbook](docs/operations-runbook.md)
- [Release checklist](docs/release-checklist.md)

## Security and dependency automation

- Dependabot config: [.github/dependabot.yml](.github/dependabot.yml)
- CodeQL analysis workflow: [.github/workflows/codeql.yml](.github/workflows/codeql.yml)
- Scheduled health alert workflow: [.github/workflows/health-monitor.yml](.github/workflows/health-monitor.yml)
- Manual predeploy gate workflow: [.github/workflows/predeploy-guardrails.yml](.github/workflows/predeploy-guardrails.yml)

### Required secrets for operations workflows

- `HEALTHCHECK_URL` for scheduled health monitoring
- `PREDEPLOY_DATABASE_URL` for predeploy DB safety checks
- `PREDEPLOY_NEXTAUTH_URL` for predeploy environment validation
- `PREDEPLOY_NEXTAUTH_SECRET` for predeploy environment validation
