# 0016. The admin app

## Status

Accepted, 13 November 2026.

## Context

L1-019 asks for feature switches that an admin works from a separate admin app, not from inside
the Popkin app. ADR 0002 says a further application is added by its own decision record. The
switches (L2-076 to L2-078) are the first thing an admin does; nothing else is asked of the admin
app yet.

## Decision

- A fourth frontend project, `admin`, is added to the Angular workspace at `frontend/projects/admin`.
  It is an application like `popkin`: pages and dialogs that compose `pk-*` components from
  `components`, service contracts from `api`, no presentation of its own (ADR 0007). It is served
  at `https://admin.popkin.community`; `admin` is already a reserved address (L2-063 AC5).
- The admin app talks to the same API, under `/api/admin/**`. Those endpoints require an admin
  session, a separate cookie (`__Secure-popkin-admin`) issued by the same code flow when the
  phone number or email is listed in the `Admin:Accounts` setting (L2-078). The setting is added
  to `docs/deployment.md` with the first admin feature (ADR 0013).
- The feature switches are rows in the database (`FeatureSwitch`: feature, on/off, changed by,
  changed at) with a `FeatureSwitchChange` record per change. The API reads them through one
  cached `IFeatureSwitches` service refreshed at least once a minute, so a change needs no
  release and no restart (L2-076 AC7). A switched-off feature's endpoints answer 404
  `feature_off` from one filter, and `PopkinHub` sends `FeatureSwitched` (a state event with the
  switch's version) so open screens change within the minute (L2-077 AC4).
- The admin app is built and deployed as part of the same frontend image behind the same proxy
  (ADR 0013), chosen by host.

## Consequences

- The e2e suite gains a project for the admin app with its own page objects; its `/api/admin/**`
  answers are mocked like every other (ADR 0005).
- Every feature that the switches cover reads `IFeatureSwitches` on the server and the
  `FeatureSwitches` store on the client; a feature that does not is always on.
- Anything the admin app shows is never a Popkin's content (L2-078 AC4). An admin feature that
  needs to see inside a Popkin would need a new decision record.
