# Feature: Wrap up (journey 9 of `docs/journeys.md`)

## Goal

The Host wraps up a Popkin from Popkin settings, or the Worker wraps it up within a minute of its end time. Every member who has it open moves to the recap without a reload; from then on it is read-only, the album is kept or removed after 30 days as the Host chose, and the recap counts what happened and offers to save the album or pop up another with the same crew.

**Journey:** 9. Wrap up: "Host or time ends the Popkin; it turns read-only with a recap." Estimated at 5 days in `docs/journeys.md`.

**Before you start:** Journeys 1 to 8 are merged; chat, photos, experiences and the Popkin home exist.

**In scope:**

- The Popkin settings menu dialog with the items whose actions exist so far: Invite people and, for the Host, Wrap up (L2-020 AC1, AC2 in part). Journeys 16 and 18 add the rest.
- The wrap-up screen `/p/:popkin/wrap-up` in its default, album-off, submitting and error states, with the Host-only rule (L2-043).
- The Worker job that wraps up Popkins whose time is up, the one-hour-left banner, and the live move to the recap (L2-044 AC1 to AC4).
- Read-only behaviour: the chat line instead of the composer, `409 popkin_wrapped_up` on every write and on join, read-only Photos, removal after 30 days when the album was not kept, the recap first (L2-045).
- The recap `/p/:popkin/recap` in its default, host, loading and error states (L2-046), and recap links from My Popkins and from invites (L2-016 AC3, L2-018 AC2).

**Stays unchanged:**

- Every write's normal behaviour for an active Popkin.
- Edit name and look, Change how long it lasts and Leave (journeys 16 and 18).

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: the alignment check of its requirement, design and
  mocks, the `pk-*` components it needs, test-first implementation, the estimate update, green tests and a PR.
  Go through every phase and every slice in one continuous run. Do not pause between phases to report, ask
  for approval, or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  in `docs/adr/`, or the open-questions section of the detailed design), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md` exactly, and read the ADRs in `docs/adr/` for every area you touch. In particular:
  - **Purpose.** Every change serves Popkin's purpose as `AGENTS.md` states it. Use the words of
    `docs/specs/L1.md`, `docs/specs/L2.md` and `docs/journeys.md` in code, docs and UI; invent no synonyms.
  - **ATDD and slices are mandatory.** Invoke and follow the `implementing-incrementally` skill before any
    code is written. For each slice: Given-When-Then criteria, then the acceptance test, then run it and show
    it fails for the expected reason, then the minimum production code. No bulk implementation, no tests
    added afterwards.
  - **Backend (ADR 0001, ADR 0005).** Layers depend one way: `Popkin.Domain` <- `Popkin.Application` <-
    `Popkin.Infrastructure` <- `Popkin.Api` / `Popkin.Worker` / `Popkin.Cli`. Business rules live in MediatR
    handlers and domain services, never in controllers. Endpoints need authentication by default; keep
    intentional `[AllowAnonymous]` and keep Swagger above `UseAuthentication`. Errors are ProblemDetails with
    a `code` extension where a client branches on them (`popkin_not_found` 404, `host_only` 403,
    `popkin_wrapped_up` 409, `rate_limited` 429). Owned data stays scoped to its owner and to the Popkins a
    person belongs to; a non-member gets `404 popkin_not_found`. The API never migrates on startup. Backend
    tests are API integration tests on the EF Core InMemory provider, one store per fixture, never a real
    database; inject faults through `IAppDbContext`.
  - **Frontend (ADR 0002, ADR 0004, ADR 0007).** Presentation lives only in the `components` library as
    `pk-*` components (`name.ts` + `name.html` + `name.scss`, `templateUrl`/`styleUrl`, default
    encapsulation, BEM named as in `docs/design-system/components/`, state through attributes such as
    `aria-pressed`, `aria-invalid`, `aria-current`, `disabled`). Pages and dialogs in
    `frontend/projects/popkin/src/app/` are `name.ts` + `name.html` containers with no stylesheet, no inline
    `style` and only the layout and text utility classes. Read tokens by role, never hex. Declare each
    `ng-content` slot once. Services in `frontend/projects/api/src/lib/` have a contract and an injection
    token; pages depend on the token; `app.config.ts` is the composition root. Button-triggered editing
    opens a CDK Dialog in `dialogs/` or navigates to a screen; never an inline form. Route data sets `shell`
    and `page` (stamped on `<body data-page>`). Every interaction works by touch at 360 px and by keyboard;
    colour is never the only carrier of a state.
  - **E2E (ADR 0003, ADR 0005, ADR 0006, ADR 0008).** Specs import `test` and `expect` from
    `e2e/fixtures/pk-test.ts`. Every `/api/**` request is answered from `e2e/fixtures/api/responses.json`;
    states the recording lacks are stubbed in `e2e/fixtures/stubs.ts`; live updates over the SignalR hub are
    answered with Playwright's WebSocket routing, never a real backend. When an endpoint's answer changes,
    refresh the recording against the local API (`eng/Start-E2eApi.ps1`, `npm run record-api` in `e2e/`) in
    the same change. One page object per screen or dialog in `e2e/pages/`; no selector in a test. Key every
    screen state in `e2e/fixtures/routes.ts` with its `app` path and its `mock` file. Every new `pk-*`
    component gets a parity spec in `e2e/tests/parity/` built with `e2e/fixtures/parity.ts`, and you run
    `npm run parity`. Write and keep current the visual, responsive and accessibility sweeps for new screen
    states, but **never run** `npm run sweeps`, `npm run baseline`, or anything that sets `PK_SWEEPS=1` or
    `PK_BASELINE=1`. Chromium only.
  - **Never write architecture tests**: no structure, naming, banned-API or spec-parsing tests. Do not
    write tests for mocks or the design system.
  - **`<TO SUPPLY>` providers.** Where a design leaves a provider open (SMS, email, photo store, media relay),
    put it behind an Application-layer interface with a development implementation, record the choice in the
    design's open questions, and never call a real external service from any test.
  - **Screens from later journeys.** When this journey links to a screen another journey builds, route to
    its real path from `docs/mocks/manifest.json` and assert the navigation (the URL and `data-page`), not
    that screen's content. Do not build that screen here.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.
- Commit one slice per commit, subjects in the imperative mood (`CONTRIBUTING.md`). Develop on the branch
  the session names, or on a new branch from `main` if none is named.

## Phase 1: Line up the requirement, the design and the mocks (`engineering-requirements`, `writing-software-design-documents`, `writing-html-mocks`)

The requirement, the detailed design and the mocks for this journey already exist. Read them in full before
any code, and change them only where they disagree with each other or leave a gap the implementation needs.

- Requirements: L2-043, L2-044 (AC1 to AC4), L2-045, L2-046, L2-016 (AC3), L2-020 (AC1, AC2 for Invite people and Wrap up) in `docs/specs/L2.md` (they trace to L1-011 in `docs/specs/L1.md`).
- Detailed designs this journey realises:
  - `docs/detailed-designs/wrap-up/host-wraps-up/README.md`
  - `docs/detailed-designs/wrap-up/time-is-up/README.md`
  - `docs/detailed-designs/wrap-up/read-only-popkin/README.md`
  - `docs/detailed-designs/wrap-up/recap/README.md`
  - `docs/detailed-designs/popkins/popkin-settings/README.md`
- Cross-cutting designs that apply to every slice here:
  - `docs/detailed-designs/security/membership-authorisation/README.md`
  - `docs/detailed-designs/security/personal-data-protection/README.md`
  - `docs/detailed-designs/reliability/loading-failure-offline/README.md`
  - `docs/detailed-designs/accessibility/wcag-2-2-aa/README.md`
  - `docs/detailed-designs/accessibility/responsive-layout/README.md`
  - `docs/detailed-designs/accessibility/light-and-dark-themes/README.md`
  - `docs/detailed-designs/accessibility/optional-motion/README.md`
- Mocks (the source of truth for the UI), by screen and state as listed in `docs/mocks/manifest.json`:
  - `docs/mocks/pages/wrap-up/`: default, album-off, submitting, error
  - `docs/mocks/pages/wrapped-up/`: default, host, loading, error
  - `docs/mocks/pages/group-chat/read-only.html`
  - `docs/mocks/dialogs/popkin-settings/`: default, member
  - `docs/mocks/notifications/banner/`: warning, persistent
- Known conflicts and open points to respect: the Worker job is the first in `backend/src/Popkin.Worker/`: test it in `backend/tests/Popkin.Worker.Tests/` on the InMemory provider with an injected clock, never by waiting. The album zip (L2-046 AC4) is prepared from the photo store with progress. Inviting the old crew (L2-046 AC5) reuses start-a-Popkin and sends each member the invite in the way the recap design says.
- If a criterion, design and mock disagree, follow the source `docs/detailed-designs/README.md` names for that
  conflict. For a new one, fix the artifact that is wrong with the skill that owns it (requirements with
  `engineering-requirements`, designs with `writing-software-design-documents`, mocks with
  `writing-html-mocks`), and note it in the design's README. Do not write tests for these artifacts.

## Phase 2: The `pk-*` components the screens need

- The mocks for this journey compose these design-system components (`docs/design-system/components/`):
  `pk-screen`, `pk-top-bar`, `pk-switch`, `pk-button`, `pk-banner`, `pk-stat`, `pk-photo-grid`, `pk-card`, `pk-rating`, `pk-progress`, `pk-dialog`, `pk-list-row`, `pk-alert`, `pk-skeleton`.
- Reuse every one that already exists in `frontend/projects/components/src/lib/`. Build each missing one there,
  one folder each, from its design-system page: anatomy, variants, sizes, every state, both themes, its
  tokens, its accessibility notes and the mock's BEM classes. Export it from the library's public API.
- For each new component, add its parity spec in `e2e/tests/parity/` (ADR 0008) and its page-object region,
  and make `npm run parity` pass in `e2e/`. Build a component in the same slice as the first screen that
  uses it, so it is proven by that slice's behaviour test as well.
- If a component needs something the design system lacks, update `docs/design-system/` first (with
  `extracting-design-systems`), then the component.

## Phase 3: Incremental implementation (`implementing-incrementally`, test-first)

- Plan thin vertical slices. A suggested plan, which you can adjust:
  1. Settings menu: Host sees Invite people and Wrap up; a member sees Invite people (L2-020 AC1, AC2 in part).
  2. Host wraps up: the screen copy, the album switch and its line, Wrap it up with submitting, Not yet and Back, failure keeps it active, 403 for non-Hosts (L2-043).
  3. Recap: headline, name and dates, three photos and emoji, the counts with thousands separators, top-rated moment when one exists; loading and error (L2-046 AC1 to AC3).
  4. Read-only: the chat line, 409 on every write and on join, Photos browse-only, the recap first; invite links and My Popkins open the recap (L2-045 AC1 to AC3, AC5, L2-016 AC3, L2-018 AC2).
  5. Time is up: the Worker wraps up within a minute keeping the album; no end date stays active; the one-hour banner with Change how long it lasts for the Host (routed only); open screens move to the recap live (L2-044 AC1 to AC4).
  6. Album not kept: a notice of days left, and photos deleted after 30 days by the Worker (L2-045 AC4).
  7. Save the album as a zip with progress (L2-046 AC4).
  8. Pop up another with this crew for the Host, Start your own Popkin for members (L2-046 AC5, AC6).
- For each slice:
  - Write the Given-When-Then criteria, taken from the acceptance criteria above.
  - Write the acceptance tests: an API integration test in `backend/tests/Popkin.Api.Tests/` (InMemory
    provider) for every endpoint rule, and a Playwright behaviour spec in `e2e/tests/` with its page objects in
    `e2e/pages/` for every screen behaviour, its routes in `e2e/fixtures/routes.ts` and its answers recorded in
    `e2e/fixtures/api/responses.json` or stubbed in `e2e/fixtures/stubs.ts`.
  - Run them and show that they fail for the expected reason.
  - Implement the minimum that makes them pass, and refactor while the tests are green.
  - Run the regression checks: `pwsh eng/Test-Backend.ps1` from the repository root; `npm run lint`,
    `npm run format:check` and `npm run build` in `frontend/`; `npm run typecheck`, `npm test` and
    `npm run parity` in `e2e/`. Then commit.
- Add or update the sweeps for each new screen state (routes, page-object regions, entries in
  `e2e/tests/visual/`, `responsive.spec.ts` and `accessibility.spec.ts` where a requirement calls for them).
  Write them; do not run them.

## Phase 4: Bring progress and docs to their true state (`estimating-designs`)

- Update `docs/estimates/` with the `estimating-designs` skill so that each design this journey touches shows
  its true percent complete, and the root README's overall estimate and roadmap match.
- Keep the requirements, designs and mocks aligned with what was built. Update `README.md` if a command,
  prerequisite or setting changed.

## Deferred (not in this journey)

- Edit name and look and Change how long it lasts (journey 16); Leave this Popkin (journey 18).

## Done means

- A Popkin wraps up when the Host chooses or its time is up, every open screen moves to the recap, every write is refused with 409, and the recap shows what L2-046 lists.
- Every acceptance criterion of L2-043, L2-044 (AC1 to AC4), L2-045, L2-046, L2-016 (AC3), L2-020 (AC1, AC2 for Invite people and Wrap up) that is in scope above has a passing test that proves it.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run typecheck`, `npm test` and `npm run parity`. No sweep was run.
- Docs, estimates and design artifacts agree with the code.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md` (what changed, why, the requirements it satisfies and how it was tested), with CI green. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
