# Major Dependency Migration Plan

This document tracks planned major dependency upgrades that require scheduled migration work before they can be merged. Dependabot is configured to suppress automatic major-bump PRs for each package listed here until the corresponding migration is complete.

## Status legend

- 🔴 **Blocked** – not yet started; major Dependabot PRs are suppressed
- 🟡 **In progress** – migration branch or spike exists
- 🟢 **Done** – migration merged; Dependabot ignore rule should be removed

---

## React / React DOM

| Item | Detail |
|------|--------|
| Current | `react@19`, `react-dom@19` |
| Blocked upgrade | `react@20+`, `react-dom@20+` |
| Status | 🔴 Blocked |

**Why this is gated:**
Next.js has a specific supported React version range per major release. A React major bump must be validated against the corresponding `next` peer requirement to avoid hydration breakage, Server Components incompatibilities, and build-time errors.

**Migration checklist:**
- [ ] Identify the minimum `next` version that supports the target React major
- [ ] Review React upgrade guide for breaking changes (hooks, concurrent features, deprecated APIs)
- [ ] Update `react`, `react-dom`, `@types/react`, `@types/react-dom`, and `next` together in a single PR
- [ ] Run `npm run lint && npm run build` clean
- [ ] Run full CI matrix (Node 22 + Postgres strict health)
- [ ] Verify `/login`, `/health`, and all smoke routes pass
- [ ] Remove Dependabot ignore rules for `react`, `react-dom`, `@types/react`, `@types/react-dom` after merging

---

## Prisma / @prisma/client

| Item | Detail |
|------|--------|
| Current | `prisma@6`, `@prisma/client@6` |
| Blocked upgrade | `prisma@7+`, `@prisma/client@7+` |
| Status | 🔴 Blocked |

**Why this is gated:**
Prisma major releases routinely include breaking changes to the schema DSL, migration engine behavior, and the generated client API. Upgrading without a coordinated schema and code review risks silent data access regressions or failed migrations in production.

**Migration checklist:**
- [ ] Read the Prisma v7 migration guide (see https://www.prisma.io/docs/guides/upgrade-guides)
- [ ] Audit `prisma/schema.prisma` for deprecated field types or directives
- [ ] Run `npx prisma migrate dev` on a local DB with the new version and confirm no unexpected schema changes
- [ ] Review generated client API changes in `src/` — update any removed or renamed methods
- [ ] Run `npm run prisma:generate && npm run build` clean
- [ ] Run `npm run db:safety-check` and confirm migration status is clean
- [ ] Run full CI matrix with a real Postgres service (strict health job)
- [ ] Remove Dependabot ignore rules for `prisma` and `@prisma/client` after merging

---

## ESLint

| Item | Detail |
|------|--------|
| Current | `eslint@9`, `eslint-config-next@16` |
| Blocked upgrade | `eslint@10+`, `eslint-config-next@(next major)+` |
| Status | 🔴 Blocked |

**Why this is gated:**
ESLint v10 is expected to drop the legacy `.eslintrc` config format. This project uses the flat config format (`eslint.config.mjs`) but `eslint-config-next` compatibility with new ESLint majors must be verified. A mismatch causes the `npm run lint` step in CI to fail on every PR.

**Migration checklist:**
- [ ] Check `eslint-config-next` release notes for the target ESLint major compatibility
- [ ] Run `npm run lint` with the new ESLint version and resolve any rule breakage
- [ ] Confirm `eslint.config.mjs` flat config works without deprecated options
- [ ] Update `eslint` and `eslint-config-next` together in a single PR
- [ ] Run full CI matrix clean
- [ ] Remove Dependabot ignore rules for `eslint` and `eslint-config-next` after merging

---

## Removing a suppression after migration

Once a migration PR is merged, remove the corresponding `ignore` block from `.github/dependabot.yml` so that future patch and minor updates resume automatically.
