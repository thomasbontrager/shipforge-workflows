# Release Checklist

Use this checklist before merging to `main` or cutting a production release.

## Quality gates

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run smoke:test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run verify:all` passes

## Configuration sanity

- [ ] Required environment variables are defined in target environment
- [ ] `CHECK_ENV_MODE=ci ... npm run env:check` passes in pipeline
- [ ] `NEXTAUTH_SECRET` is set to a strong value
- [ ] `NEXTAUTH_URL` matches the target deployment URL
- [ ] `DATABASE_URL` is correct and reachable

## Branch governance

- [ ] Branch protection is compliant (`npm run branch-protection:check`)
- [ ] All required PR checks are green
- [ ] At least one review approval is present

## Deployment readiness

- [ ] CI workflow completed successfully on this commit
- [ ] Health endpoint behavior is verified in environment
- [ ] No unresolved critical or high severity vulnerabilities
- [ ] CodeQL analysis has no unresolved high severity findings
- [ ] Dependabot security updates reviewed
- [ ] `BACKUP_CONFIRMED=true DATABASE_URL=... npm run db:safety-check` passes

## Post-deploy validation

- [ ] `/health` responds as expected
- [ ] Login page is reachable (`/login`)
- [ ] API smoke flows work (`/api/signup`, `/api/contact`, auth routes)
- [ ] Logs show no unexpected error spikes
- [ ] Health monitor workflow has `HEALTHCHECK_URL` configured and recent successful run

## Sign-off

- [ ] Release owner approved
- [ ] Incident rollback owner identified
