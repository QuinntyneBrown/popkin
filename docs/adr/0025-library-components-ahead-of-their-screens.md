# 0025. Library components may be built ahead of their screens

## Status

Accepted, 15 November 2026; amended by [ADR 0029](0029-one-library-no-unused-components.md), which withdraws building ahead of a screen. Amends [ADR 0008](0008-component-parity-specs.md) for components
built before any screen uses them.

## Context

`docs/component-backlog.md` lists the design-system components that `frontend/projects/components`
does not build yet. Until now each component was built with the screen that first uses it: the
screen's acceptance test failed first, and the component's parity spec (ADR 0008) compared it
with the mock inside that screen.

On 15 November 2026 the owner asked for eleven of them (#2, #4, … #22 of the backlog) to be
built now, in the library only, before their screens: the admin Person, Dashboard, Limits,
Settings and Health screens, and every Contacts screen. Contacts has no L1 or L2 requirement
and no detailed design yet (open question 10 in the mocks' README).

With no screen, there is no region to compare with the mock and no behaviour to prove first.

## Decision

- A library component may be built from its design-system page before any screen uses it.
  It follows every library rule (ADR 0004, ADR 0007): its own `.ts`, `.html` and `.scss`, one
  encapsulated BEM block named as in the mock, tokens by role.
- Its parity spec (ADR 0008) and the acceptance test that proves it are written with the first
  screen that uses it, in that screen's change. Until then it is checked by lint and by the
  apps' AOT build only.
- The six Contacts components are built ahead of a Contacts requirement. A Contacts requirement
  and detailed design still come before any Contacts screen.

## Amendment, 15 November 2026

The odd-numbered components of the backlog (#1, #3, … #21) were built the same day under this
decision, five of them for Contacts. Besides lint and the apps' AOT build, the library and its
templates are type checked on their own (`npx ngc -p projects/components/tsconfig.lib.json
--noEmit` in `frontend/`), since no app imports these components yet; and the logic two of them
rely on, the trend chart's geometry (`trendChartOf`) and the connection map's focus and filter
(`connectionMapOf`), lives in the `api` library with its unit tests (ADR 0011).

## Consequences

- The components are ready when their screens are built.
- Until a screen uses one, nothing proves it matches its mock; it may drift from the mock or
  need changes when its screen and its requirement arrive. The first screen to use it fixes any
  difference at its source (ADR 0008).
- The backlog marks these components as built with parity pending.
