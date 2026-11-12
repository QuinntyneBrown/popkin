# 0002. Frontend workspace

## Status

Accepted, 12 November 2026.

## Context

`AGENTS.md` asks for an Angular workspace of an application and two libraries, `pk-*`
selectors, the mocks' BEM classes in the app, and visual parity with `docs/mocks`.

## Decision

- The workspace uses Angular 22 without zone.js, standalone components and signals.
- It starts with three projects: `popkin` (the app), `api` (service contracts,
  implementations, view models, pure helpers) and `components` (the `pk-*` presentation
  components). A further application (a marketing site, an admin application) is added by its
  own decision record.
- `api` and `components` are consumed from source through the `paths` of
  `frontend/tsconfig.json`. They are not packaged, so there is one build and no build order.
- `frontend/projects/components/src/lib/styles/` holds the global foundations. The token set is
  a copy of the design system's `tokens.css`; when the design system lands, `npm run
  design:sync` refreshes the copy and `npm run design:check` (run in CI) fails when it differs.
- A component whose root is a native element in the mocks uses an attribute selector on that
  element, for example `button[pk-button]`. The DOM of the app is then the DOM of the mock.
- Frontend behaviour is tested with Playwright only. The workspace has no unit-test runner.

## Consequences

- A change to the look of a component is made in the design system and its mock first.
- The libraries cannot be published as they are. Packaging them is a later decision.
