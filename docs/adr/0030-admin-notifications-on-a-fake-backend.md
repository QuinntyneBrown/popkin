# 0030. The admin app's Notifications page runs on a fake backend until the API has one

## Status

Accepted, 17 November 2026. Amends [ADR 0023](0023-features-switched-on-by-a-setting.md), whose
"no build-time flag, no environment file" it sets aside for the admin app's one setting below,
and only until the backend this record waits for is built.

Ended, 17 November 2026. The API serves every endpoint under `/api/admin/notifications`, so the
fake, the `fakeNotificationsBackend` setting and the admin app's `e2e` build configuration are
deleted, as the consequences below say, and `responses.json` holds the recorded answers. ADR
0023 applies to the admin app again without exception.

## Context

The admin Notifications page (L1-042, L2-169 to L2-173) is specified, designed
([Member email and notification kinds](../detailed-designs/admin-platform/notifications/README.md),
[Notification holds](../detailed-designs/admin-platform/notification-holds/README.md),
[Notification defaults](../detailed-designs/admin-platform/notification-defaults/README.md)) and
drawn. The owner wants the admin app's side built first, with the backend left for later. No
endpoint under `/api/admin/notifications` exists, and `GET /api/admin/me` grants neither
`ManageNotifications` nor `HoldNotifications`.

Every commit to main is deployed ([ADR 0018](0018-deploy-to-azure-on-every-commit.md)). Built
against the real API alone, the page would open on its error state in every environment until the
backend lands, and nobody could try it. The e2e suite answers every `/api/**` request in
Playwright ([ADR 0005](0005-tests-without-a-backend-or-database.md)) and needs those requests on
the network to drive the busy, failed and refused states.

## Decision

- **The contract is the real one.** `ADMIN_PLATFORM_API` and `HttpAdminPlatformApi` gain the
  notification methods and DTOs exactly as the designs give them. Pages, dialogs and stores do not
  know a fake exists.
- **The fake sits at the wire.** `fakeAdminNotificationsBackend`, an `HttpInterceptorFn` in the
  `api` library (`api/admin/platform/fake/`), answers `/api/admin/notifications/**` from memory.
  It starts from the mocks' data, in the requirement's words, and refuses as the designs do, with
  the same ProblemDetails `code`s. It also adds `ManageNotifications` (Owner) and
  `HoldNotifications` (Owner, Support) to `GET /api/admin/me`. Its state lasts until the page is
  reloaded. Its rules have unit tests ([ADR 0011](0011-unit-tests-for-frontend-logic.md)).
- **One build-time setting switches it on.** The admin app's `environment.ts` sets
  `fakeNotificationsBackend: true`, and `app.config.ts` adds the interceptor only when it is set.
  The admin project's `e2e` build configuration replaces that file with one that sets it to
  `false`, and Playwright serves the admin app with that configuration. Every notification request
  in a test therefore reaches the network and is answered by `e2e/fixtures/admin.ts`, as Features
  is.
- **Nothing is recorded.** `responses.json` gains no notification answers until the API serves
  them. The fixtures build the answers from the designs' DTOs.

## Consequences

- The deployed admin app shows the Notifications page working, but nothing it does reaches a
  member. Its counts and holds are the fake's, and they reset on reload.
- When the backend is built, the change that builds it deletes `api/admin/platform/fake/`, the
  environment files and the `e2e` configuration, and records the endpoints' answers. No page,
  dialog or store changes.
- Until then, a change to an endpoint's design changes the fake and the e2e fixtures together.
