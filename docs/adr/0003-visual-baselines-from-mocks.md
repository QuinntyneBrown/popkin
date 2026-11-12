# 0003. Visual baselines are rendered from the mocks

## Status

Accepted, 12 November 2026.

## Context

`docs/mocks` is the approved appearance of every screen and state. Visual regression tests need
a runner, a threshold and a place for their baselines.

## Decision

- Playwright runs the suite, in Chromium only.
- Baselines are not stored. `PK_BASELINE=1` runs the visual specs against the mocks (served from
  `docs/`) and writes the screenshots to `e2e/__baselines__/`, which is ignored by git. The
  same specs then run against the app and compare.
- Specs open screens through `e2e/fixtures/routes.ts`, which maps one key to the app route, the
  scenario that produces the state, and the mock file.
- A screen is compared region by region, not as one page, so a failure names the part that
  differs.
- A region fails when more than 1 % of its pixels differ.
- States that recorded data cannot produce (loading, empty, error, edge, long) are produced by
  answering the API request in the browser with a data fixture.

## Consequences

- The mock and the app are always rendered by the same browser on the same machine, so fonts and
  anti-aliasing cannot cause a difference between a developer's machine and CI.
- Changing how a screen looks means changing its mock; nothing else can move a baseline.
- The app must be given the data the mock shows.
