# 0029. One component library, reused everywhere, with no component built ahead of its screen

## Status

Accepted, 17 November 2026. Amends [ADR 0025](0025-library-components-ahead-of-their-screens.md),
whose decision it reverses for components no screen uses, and
[ADR 0007](0007-presentation-in-the-components-library.md), whose rule it applies to layout
spacing and to logic shared by the applications.

## Context

The [code quality and redundancy audit](../code-quality-and-redundancy-audit.md) of 17 November
2026 found, in the frontend:

- 24 library components that no screen uses (RD-06), built ahead of their admin screens under
  ADR 0025, and `trendChartOf`, the trend chart's geometry in the `api` library, used by one of
  them;
- components that look alike: three key-value components and eight chip rows (RD-07);
- application templates that write the modifiers `stack--sm`, `stack--lg`, `cluster--center`,
  `cluster--between` and `field__label`, which ADR 0007 does not allow, and a raw list in the
  Delete your account dialog (CQ-15);
- logic written more than once in the applications and the `api` library: confirmation dialogs
  (RD-04, CQ-07), the end of a session (RD-05, CQ-06), the guards and 401 interceptors of
  `popkin` and `admin` (RD-03), two outboxes (RD-01, RD-02), the 300 ms wait before a screen
  says it is loading (RD-15), plural and relative-day text (RD-16), and model types (RD-08).

A component built ahead of its screen is checked by nothing but the build (ADR 0025). Until a
screen uses it nothing proves it matches its mock, and it is code to keep current with every
change to the library.

## Decision

### A library component exists only while a screen uses it (RD-06)

- A component is built with the first screen that uses it, in that screen's change, with its
  parity spec (ADR 0008) and the screen's acceptance test. ADR 0025's permission to build ahead
  of a screen is withdrawn.
- The 24 unused components are removed with their exports: `app-preview`, `attention-list`,
  `change-list`, `evidence`, `figure-tabs`, `headline-figure`, `health-summary`,
  `history-item`, `job-detail`, `job-toggle`, `key-values`, `limit-row`, `log-list`,
  `record-list`, `release-note`, `report-detail`, `report-item`, `save-bar`, `service-card`,
  `settings-list`, `tile`, `tiles`, `trend` and `uptime`. `trendChartOf` and its spec go with
  `trend`. Each name was searched for across the workspace and the e2e suite first: `tile` and
  `tiles` were used only by each other, the rest by nothing.
- Their design-system pages and mocks stay: they are the source the screen's change rebuilds
  them from. `docs/component-backlog.md` marks their rows "Not built: built with its screen".

### Components that look alike: one merge, the rest kept apart (RD-07)

A merge is made only where the mocks draw the same block.

- **Merged: the who chip.** `pk-who-chips` (Who's on it?, a toggle in a labelled group) and
  `pk-drift-chips` (It's been a while, links) both drew and styled the design system's
  `who-chip` block, each in its own stylesheet. The block becomes one component,
  `pk-who-chip` (`button[pk-who-chip], a[pk-who-chip]`), as `pk-chip` is for `chip`: the button
  shows `aria-pressed`, the link reads in the default colour (`a.who-chip`). The two rows
  compose it and keep their own jobs.
- **Kept apart, because they are different patterns of the one `chip` block** that each already
  compose `pk-chip`: `pk-filter-chips` (pressed buttons, one at a time, with counts),
  `pk-choice-chips` (a radio group with roving focus), `pk-toggle-chips` (pressed buttons, any
  number, under a label) and `pk-group-chips` (links). Each has its own role and keyboard
  behaviour; one component with a mode for each would carry four ARIA patterns behind one
  input.
- **Kept apart, because the mocks draw another block:** `pk-week-chips` draws the Schedule's
  `weeks` strip (a scrolling row of week links with a dot for an event, between previous and
  next).
- **Field labels.** `pk-choice-chips` and `pk-who-chips` styled `.field__label` in their own
  stylesheets, the text field's element. They compose `pk-field-label`, as `pk-toggle-chips`
  does.
- **Kept apart: the key-value components.** `pk-contact-facts` (a description list whose terms
  are icons, the person's details on a profile), `pk-facts` with `pk-fact` (a list of features,
  each an icon tile, a title and a sentence) and `pk-stat-pair` (two figures side by side under
  a hairline) are three different blocks in the mocks. `key-values` and `settings-list` go with
  RD-06.

### Spacing and lists in application templates (CQ-15)

The modifiers of `stack` and `cluster` are layout, but an application template may write only
the utilities ADR 0007 lists. Two layout components carry them, so a template sets spacing with
a knob, not a class:

- `pk-stack` (`div[pk-stack], ul[pk-stack], form[pk-stack], section[pk-stack]`), with
  `gap` `sm` (12px), `md` (16px, the plain `stack`) or `lg` (24px);
- `pk-cluster` (`div[pk-cluster], p[pk-cluster]`), with `justify` `start`, `center` or
  `between` (`between` does not wrap, as `cluster--between` does not).

Both keep the mocks' classes (`stack stack--sm`, `cluster cluster--between`) on their host for
the e2e locators. The plain `stack` and `cluster` utilities stay for the default spacing; the
modifiers stay in `ui.css` for the library's own templates. A label over a control that is not a
text field is `pk-field-label`. The list of what goes and what stays in Delete your account is
`pk-term-list`: each item a bold term and its sentence.

### Logic shared by the applications lives once in `frontend/projects/api` (ADR 0011)

Each piece below has its unit tests in the `api` library.

| Piece | Where | Used by |
|---|---|---|
| Confirmation dialog state (`ConfirmDialogState`): `busy`, `failed`, the failure, one send at a time, and `disableClose` on its dialog while busy | `api/dialogs/confirm-dialog-state.ts` | the five async confirmations of `popkin`, sign out, delete your account; admin's `ActionDialogState` builds on it |
| The end of a session (`SessionTeardown`): stops the real-time connection, forgets the session and the saved list of My Popkins, then opens a screen at its top | `api/auth/session-teardown.ts` | sign out, delete your account, the 401 interceptor |
| Guard and 401 interceptor factories (`signedInGuardOf`, `signedOutGuardOf`, `unauthorizedInterceptorOf`) | `api/auth/session-guards.ts` | `popkin` and `admin`, each configured in its `app.routes.ts` and `app.config.ts` |
| One outbox storage and queue (`JsonListStorage`, from PR 89, and `OutboxQueue`) | `api/storage/json-list-storage.ts`, `api/storage/outbox-queue.ts` | `MessageOutbox`, `ContactsOutbox` |
| The 300 ms wait before "loading" (`DelayedLoading`) | `api/loading/delayed-loading.ts` | the stores that read a screen |
| Shared text: counts, relative days, short months and weekdays | `api/text/` | the `*-text.ts` helpers |

- One confirmation dialog without a request: Delete this message and Delete this comment are one
  dialog, `ConfirmDeleteDialog`, given its heading, sentence and button labels by its opener.
- `DelayedLoading` is the skeleton timer of the designed `screenLoad()` (known gap 24); the
  offline cache of that design stays a gap.
- The model types named in RD-08 are declared once and the duplicates become aliases or
  extensions of them, so no request or response changes shape.

## Consequences

- No component in the library is unused, and every one has a parity spec.
- An admin screen that is built rebuilds its components from their design-system pages; the
  removed code stays in git history as a starting point, not as the source.
- Application templates set spacing through `pk-stack` and `pk-cluster`; the build and review
  hold the rule as before.
- A confirmation dialog cannot be closed by Escape, the backdrop or Cancel while its request is
  under way, the same in every dialog.
- Signing out, deleting the account and a 401 end the session in one place; the 401 now also
  stops the real-time connection. Clearing the outboxes there (CQ-05) is a follow-up.
