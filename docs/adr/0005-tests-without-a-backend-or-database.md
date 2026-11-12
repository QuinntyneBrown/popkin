# 0005. Tests run without a real backend or database

## Status

Accepted, 12 November 2026.

## Context

A browser suite that runs in front of a real API on a seeded database has to build and start the
API, and every test pays for HTTP round trips to a backend whose behaviour the backend tests
already prove. The project wants the suites fast.

## Decision

- **E2E: Playwright API mocking only.** Every request the app makes to `/api/**` is answered by
  `page.route` in the `page` fixture of `e2e/fixtures/pk-test.ts`, from recorded responses in
  `e2e/fixtures/api/responses.json`. No test starts or reaches the API, and none reaches a
  database. A request with no recorded answer fails the test that made it, naming the request.
  States the recording cannot produce (loading, errors, …) patch or replace the recorded answer
  in `e2e/fixtures/stubs.ts`.
- **Recording is a maintenance step, not a test.** When the API's answers change,
  `responses.json` is refreshed against the local API (`eng/Start-E2eApi.ps1`) in the same
  change, with `npm run record-api` once the app calls its first endpoint and the recorder
  exists. The recording is reviewed like code. CI never records.
- **Backend: EF Core InMemory only.** Every backend test uses the EF Core InMemory provider
  (`Database:Provider=InMemory`, a store name per fixture). No test opens SQLite, LocalDB, SQL
  Server or a database file. The provider exists for tests only and is never configured for a
  running service.
- **Database faults in tests** are injected where the application reaches the database
  (`IAppDbContext`), because InMemory issues no SQL commands to intercept.

## Consequences

- The Playwright suite needs only the Angular dev server.
- The e2e suite proves the app against the API's contract as recorded, so a change to an API
  contract refreshes the recording in the same change.
- InMemory is not relational. Unique and filtered indexes, foreign keys, SQL translation,
  transactions and migrations are not exercised by tests. Rules the application relies on are
  enforced in handlers and the domain, and ordered collections carry an explicit position rather
  than relying on storage order.
