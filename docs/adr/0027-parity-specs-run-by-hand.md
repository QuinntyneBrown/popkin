# 0027. The component parity specs run by hand, not in CI

## Status

Accepted, 15 November 2026. Amends ADR 0008, which had CI run `npm run parity` after the
behaviour specs.

## Context

By November 2026 the parity specs had grown to about 2,100 cases, and they took about 20 of the
Playwright job's 26 minutes. They also failed main several times when a mock and the app drifted
apart, which a parity case was never meant to judge (ADR 0008 leaves page differences to the
sweep). The repository owner decided to run the parity specs by hand.

## Decision

- CI runs the behaviour specs only (ADR 0006). It does not run `npm run parity`.
- `npm run parity` is unchanged. Agents run it when they change a `components` component or a
  mock (ADR 0008), and the repository owner runs it by hand.
- Parity specs are still written and kept current, as ADR 0008 and ADR 0025 require.

## Consequences

- The Playwright job takes about 6 minutes, and a mock that drifts from the app no longer blocks
  a deploy (ADR 0018).
- A visual regression in a component is caught only when someone runs `npm run parity`, so an
  agent changing a component or a mock runs it before finishing.
