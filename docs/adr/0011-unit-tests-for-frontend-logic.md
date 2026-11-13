# 0011. Unit tests for the `api` library's logic

## Status

Accepted, 13 November 2026. Amends ADR 0006: besides the behaviour Playwright specs, the unit
tests of the `api` library run by default and in CI.

## Context

The frontend is tested only through Playwright, against recorded answers. That suits pages. The
chat designs put logic with many branches in the `api` library: `ThreadStore` (duplicates,
echoes, a delete that arrives before its message, scroll anchoring), `MessageOutbox` (order, the
pause behind a failed entry, retry), `UnreadTracker`, and the version rule that drops a stale
state event. Driving every branch of an outbox through a browser with stubbed failures is slow
and indirect, and the cases a browser test skips are the ones that fail in the field.

The alternative was to record that Playwright alone covers this logic and to build the stub
fixtures to make every branch reachable. It was rejected: testing a pure rule through its unit is
the practice of the platform (`AGENTS.md`, "Prefer best practice").

## Decision

- Stores, trackers and pure helpers of the `api` library have unit tests beside them
  (`name.spec.ts`), run by the Angular CLI's test builder with `ng test api` (`npm test` in
  `frontend/`). They need no browser, no API and no recording.
- CI runs them in the `frontend` job. A suite CI does not run is not a suite.
- A unit test proves a rule of one unit: given this state and this event, the store holds that.
  It is a behaviour test. Tests of the codebase's shape stay banned (`AGENTS.md`).
- Pages, dialogs and `pk-*` components are not unit tested. Their behaviour is proved by
  Playwright (ADR 0006) and their look by the parity specs (ADR 0008).
- The Playwright acceptance test stays the proof of each slice. Unit tests cover the cases of a
  rule; the acceptance test keeps one or two representative paths.
- The test target and the `npm test` script are added by the first change that adds a store;
  nothing in the `api` library needs them today.

## Consequences

- The frontend gains a second kind of test and a second command to keep green.
- The first chat slice carries the set-up cost of the test target.
- Logic placed in a page instead of the `api` library escapes these tests, which is one more
  reason to keep pages as containers (ADR 0007).
