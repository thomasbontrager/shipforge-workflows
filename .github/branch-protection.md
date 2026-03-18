# Branch Protection Baseline

Use this as a copy/paste checklist for protecting `main` in GitHub.

## Recommended rules

- Require a pull request before merging
- Require at least 1 approval
- Dismiss stale approvals when new commits are pushed
- Require review from code owners (if using CODEOWNERS)
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators
- Restrict who can push to matching branches (optional, team-dependent)

## Required status checks

After the CI workflow runs at least once, add these checks as required:

- `Verify (Node 20)`
- `Verify (Node 22)`
- `Verify (Postgres strict health)`

## Optional hardened settings

- Require conversation resolution before merging
- Require signed commits
- Require linear history
- Do not allow force pushes
- Do not allow deletions

## Why this set

- Node matrix checks reduce runtime/version drift risk.
- Postgres strict health ensures DB-backed paths stay healthy.
- Approval + stale dismissal lowers accidental regression risk.

## Apply with GitHub CLI

You can apply these rules automatically with the helper script:

```powershell
./scripts/setup-branch-protection.ps1 -Owner thomasbontrager -Repo shipforge-workflows -Branch main
```

Dry-run preview:

```powershell
./scripts/setup-branch-protection.ps1 -DryRun
```

Prerequisites:

- `gh` CLI installed and authenticated (`gh auth login`)
- Auth identity with admin permissions on the repository

## Verify drift

Check whether current branch protection still matches this baseline:

```powershell
./scripts/check-branch-protection.ps1 -Owner thomasbontrager -Repo shipforge-workflows -Branch main
```

Machine-readable output:

```powershell
./scripts/check-branch-protection.ps1 -Json
```
