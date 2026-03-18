# Release Checklist

Use this checklist before merging to `main` or cutting a production release.

## Quality gates

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run smoke:test` passes
- [ ] `npm run verify:all` passes

## Configuration sanity

- [ ] Required environment variables are defined in target environment
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

## Post-deploy validation

- [ ] `/health` responds as expected
- [ ] Login page is reachable (`/login`)
- [ ] API smoke flows work (`/api/signup`, `/api/contact`, auth routes)
- [ ] Logs show no unexpected error spikes

## Sign-off

- [ ] Release owner approved
- [ ] Incident rollback owner identified
