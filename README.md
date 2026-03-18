# shipforge-workflows
GitHub Actions for Shipforge auto-deploy

## Local checks

Run lint and build:

```bash
npm run lint
npm run build
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
