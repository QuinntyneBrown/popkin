# Feature: Join by invite (journey 2 of `docs/journeys.md`)

## Goal

A person opens an invite link (by scanning the QR code with their phone camera or following the link), sees who invited them and what the Popkin is, signs up or signs in, gives the name and optional photo other members will see, joins, and is welcomed. Invites to a wrapped-up Popkin or to no Popkin say so. The invite link and code come from journey 1 (`docs/detailed-designs/invitations/invite-people/README.md`).

**Journey:** 2. Join by invite: "Invited person scans the QR, previews the Popkin, joins and is welcomed." Estimated at 5 days in `docs/journeys.md`.

**Before you start:** Journey 1 (`docs/prompts/01-start-a-popkin.md`) is merged: accounts, sessions, `PopkinSpace`, `Membership`, invite codes and the foundations exist. Read what it built before you start.

**In scope:**

- The invite screen `/i/:code` in its default, loading, wrapped, not-found and error states (L2-012, L2-016 AC1, AC2), disclosing nothing beyond what L2-012 AC5 allows.
- Join continues through sign-up or sign-in and the code screen to the profile step without opening the link again (L2-012 AC3); a member who opens the link goes to `/p/:popkin` (L2-012 AC4).
- The profile step `/i/:code/profile` with name and optional photo, and joining as a member (L2-013).
- The welcome screen `/i/:code/welcome` with its two actions and reduced-motion handling (L2-014 AC1, AC3, AC5); "Say hi to everyone" routes to `/p/:popkin/chat/everyone`.
- Avatars with initials on a stable colour for people without a photo (L2-013 AC6).
- The member's photo upload, through a photo store interface (the provider is `<TO SUPPLY>`), with location and device data stripped.

**Stays unchanged:**

- The sign-up, code and start-a-Popkin flows of journey 1, apart from carrying the invite through them.
- Membership rules: a non-member still gets `404 popkin_not_found` for anything inside a Popkin.

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

- Requirements: L2-012, L2-013, L2-014 (AC1, AC3, AC5), L2-016 (AC1, AC2), L2-051 in `docs/specs/L2.md` (they trace to L1-004, L1-012 in `docs/specs/L1.md`).
- Detailed designs this journey realises:
  - `docs/detailed-designs/invitations/preview-invite/README.md`
  - `docs/detailed-designs/invitations/join-popkin/README.md`
- Cross-cutting designs that apply to every slice here:
  - `docs/detailed-designs/security/membership-authorisation/README.md`
  - `docs/detailed-designs/security/input-validation-and-encoding/README.md`
  - `docs/detailed-designs/security/abuse-limits/README.md`
  - `docs/detailed-designs/security/personal-data-protection/README.md`
  - `docs/detailed-designs/reliability/loading-failure-offline/README.md`
  - `docs/detailed-designs/accessibility/wcag-2-2-aa/README.md`
  - `docs/detailed-designs/accessibility/responsive-layout/README.md`
  - `docs/detailed-designs/accessibility/light-and-dark-themes/README.md`
  - `docs/detailed-designs/accessibility/optional-motion/README.md`
- Mocks (the source of truth for the UI), by screen and state as listed in `docs/mocks/manifest.json`:
  - `docs/mocks/pages/join-invite/`: default, loading, wrapped, not-found, error
  - `docs/mocks/pages/your-profile/`: default, with-photo, invalid, submitting, error
  - `docs/mocks/pages/youre-in/default.html`
- Known conflicts and open points to respect: the photo store is `<TO SUPPLY>`; pick the simplest store behind an interface and record it in `invitations/join-popkin`. Carry the invite through sign-up as the design says, not through a new query parameter of your own.
- If a criterion, design and mock disagree, follow the source `docs/detailed-designs/README.md` names for that
  conflict. For a new one, fix the artifact that is wrong with the skill that owns it (requirements with
  `engineering-requirements`, designs with `writing-software-design-documents`, mocks with
  `writing-html-mocks`), and note it in the design's README. Do not write tests for these artifacts.

## Phase 2: The `pk-*` components the screens need

- The mocks for this journey compose these design-system components (`docs/design-system/components/`):
  `pk-screen`, `pk-top-bar`, `pk-avatar`, `pk-card`, `pk-button`, `pk-text-field`, `pk-photo-picker`, `pk-time-left`, `pk-alert`, `pk-empty-state`, `pk-skeleton`.
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
  1. Preview an active invite: who invited, emoji, colour, name, member count with up to five avatars, when it wraps up or no end time, the "Join" action, and nothing else disclosed (L2-012 AC1, AC2, AC5). Include the loading state.
  2. Invites that cannot be joined: wrapped-up and not-found screens with their actions, and the error state (L2-016 AC1, AC2, L2-056).
  3. A member opening their own invite goes to `/p/:popkin` (L2-012 AC4).
  4. Join as a visitor: "Join" goes through sign-up or sign-in and returns to the profile step (L2-012 AC3).
  5. Profile step and joining: the name with its hint, the "I'm in" button, the submitting and error states, the membership created (L2-013 AC1, AC3 to AC5).
  6. Profile photo: type and size limits, preview replacing the initial, metadata stripped on upload (L2-013 AC2, L2-054); initials avatars on a stable colour (L2-013 AC6).
  7. Welcome screen: the greeting with two members named and the rest counted, "Say hi to everyone" and "See the photos" navigation, no confetti under reduced motion (L2-014 AC1, AC3, AC5).
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

- The "{name} popped in" note in the Everyone thread and focus in its message field (L2-014 AC2, AC4): journey 3.
- A member of a wrapped-up Popkin opening its invite and seeing the recap (L2-016 AC3): journey 9.
- Joining by typing a code (journey 15) and the in-app Scan to join dialog (journey 6).
- The Popkin home and Photos screens these screens link to (journeys 4 and 5).

## Done means

- A person who opens an invite link can preview the Popkin, sign up or sign in, set their name and optional photo, join, and see the welcome screen; members and non-members are treated as L2-012 and L2-016 say.
- A non-member's preview reveals only what L2-012 AC5 allows, proven by an API test.
- Every acceptance criterion of L2-012, L2-013, L2-014 (AC1, AC3, AC5), L2-016 (AC1, AC2), L2-051 that is in scope above has a passing test that proves it.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run typecheck`, `npm test` and `npm run parity`. No sweep was run.
- Docs, estimates and design artifacts agree with the code.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md` (what changed, why, the requirements it satisfies and how it was tested), with CI green. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
