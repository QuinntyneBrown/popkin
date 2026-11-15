# Feature: Open the admin app (journey 24 of `docs/journeys.md`)

## Goal

Popkin staff sign in to the admin app at `admin.popkin.community` with a code sent to their
`@popkin.app` email, find their way round the console, and read the audit log of every change
made in it. An Owner adds, re-roles and removes other admins; a Support or Viewer admin sees those
actions switched off, with the reason.

**Journey:** 24. Open the admin app: "Staff sign in to the admin app with a code and read the
audit log; an Owner adds, re-roles and removes admins." Estimated at 16 days in
`docs/journeys.md`.

**Before you start:** ADR 0024 is accepted (15 November 2026). The designs are
`docs/detailed-designs/admin-access/*` (admin sign in, admin shell, admin roles, a reason for every
change, audit log, admins & roles); the mocks are `docs/mocks/admin/pages/{sign-in,not-an-admin,
audit,admins,not-found,server-error}/` and `docs/mocks/admin/dialogs/{menu,admin-add,
admin-change-role,admin-remove}/`.

**In scope:**

- The `admin` application of the workspace (ADR 0002, ADR 0016), its routes, guards and shell.
- Admins, admin sessions and the sign-in lock in the database; the `__Host-popkin-admin` cookie and
  its scheme; the first Owner from `Admin:FirstOwner` (L2-078, L2-088, L2-119 AC9).
- The role table and its checks in the handlers (L2-086); the Viewer notice and disabled actions.
- The audit log, its CSV export and its two-year deletion (L2-120, L2-087).
- Admins & roles: add, change a role, remove; the last Owner is kept (L2-119).
- The menu drawer below 1024 px, the not-found and server-error pages (L2-089).
- Serving the admin app from `popkin-web` on `admin.popkin.community`.

**Stays unchanged:** the Popkin app. An admin is an ordinary person there.

## Rules

Follow `AGENTS.md` and the ADRs of every area touched, with the `implementing-incrementally`
skill and ATDD for every slice, as the earlier prompts of this folder spell out.

## Deferred (not in this journey)

- The waiting counts beside Reports, Jobs and Album exports (`AdminWaitingStore`): those sections
  come with journeys 29 and 30.
- The dashboard: `/` opens the audit log until journey 25.
- The sections of journeys 25 to 31; each joins `ADMIN_SECTIONS` with its page.
- A narrated video of the admin journeys, once the console has its Overview.

## Done means

- Staff sign in, read and export the audit log, and an Owner manages admins, as the mocks show.
- Every acceptance criterion in scope has a passing test: API tests on `ApiFactory` and Playwright
  behaviour specs in `e2e/tests/admin/`.
- `pwsh eng/Test-Backend.ps1`, `npm run lint`, `npm run format:check`, `npm test`,
  `npm run build:admin` in `frontend/`, and `npm test` and `npm run parity` in `e2e/` pass. No
  sweep was run.
- `docs/deployment.md`, the estimates and the gap register agree with the code.
- The work is on `feature/admin-foundation` with a PR to `main`.
