# 0008. Component parity specs run with their own command

## Status

Accepted, 12 November 2026. Amends ADR 0006 (only behaviour tests run) for the component parity specs, and applies
ADR 0003 (baselines rendered from the mocks) to them.

## Context

The only full visual check, the sweep of ADR 0003, is run by the repository owner by hand
(ADR 0006). A component change needs a check small enough to run every time.

## Decision

- **One parity spec per library component**, `e2e/tests/parity/<component>.spec.ts`. It names
  the screen states that show the component's variants and takes the component's region from a
  page object; `e2e/fixtures/parity.ts` turns that into the tests.
- **Against the mock**: the region in the app is compared with the same region of the mock at
  360 px and 1280 px, in the light and the dark theme, and fails above 1 % of differing pixels.
  The baselines are rendered from `docs/mocks` on the same machine and are not committed
  (ADR 0003).
- **`npm run parity`** in `e2e/` renders the baselines of `tests/parity/` and then runs those
  specs against the app. It sets `PK_PARITY`, never `PK_BASELINE` or `PK_SWEEPS`, and runs
  nothing outside `tests/parity/`. `npm test` does not run the parity specs.
- CI runs `npm run parity` after the behaviour specs from the change that adds the first
  component; until the mocks and a component exist there is nothing to compare.
- A difference is fixed at its source: the component, or the design system and the mock first. A
  threshold is not raised and a region is not masked.
- The sweeps are unchanged: `npm run sweeps` and `npm run baseline` stay owner-run.

## Consequences

- A component change is checked visually in seconds, by agents and by CI.
- A parity spec compares a component where the page around it shows the same content in the mock
  and in the app; a state whose copy differs between the two is a page difference, and is left to
  the sweep.
