# Feature: Start a Popkin (journey 1 of `docs/journeys.md`)

## Goal

A visitor signs up with a name and a phone number or an email, confirms the six-digit code, names a Popkin, picks its emoji and colour, chooses how long it lasts, pops it up, and lands on the created screen with its QR code and invite link. They are the Popkin's Host and first member. Today the app has one placeholder screen (`frontend/projects/popkin/src/app/pages/`), the API answers only `GET /api/health` (`backend/src/Popkin.Api/Controllers/`), and there is no domain model, database schema, migration, `popkin` CLI, `pk-*` component or API recording. This is the first journey, so it also lays the foundations every later journey builds on.

**Journey:** 1. Start a Popkin: "Visitor signs up with a code, starts a Popkin and gets its QR invite." Estimated at 10 days in `docs/journeys.md`.

**Before you start:** Nothing. This is the first journey. Read `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, every ADR in `docs/adr/` and `docs/detailed-designs/README.md` (shared names, routes, cookie and error codes) first.

**In scope:**

- The sign-up screen `/sign-up` (L2-003) and the code screen `/verify` (L2-004, L2-005), with codes sent through an SMS and an email sender behind interfaces.
- Sessions (L2-007, L2-050): the `__Host-popkin` cookie (`Secure`, `HttpOnly`, `SameSite=Strict`; the scaffold sets `Lax`, see `docs/detailed-designs/accounts/sessions/README.md`), 30-day lifetime, and the route guard that sends a visitor to `/sign-in?returnUrl=...` (the sign-in screen itself is journey 6).
- Name your Popkin `/new` (L2-008), How long `/new/length` with the End date dialog (L2-009), creating the Popkin with its Host membership and invite code (L2-010, L2-011 AC5), and the created screen `/p/:popkin/created` with its QR code, Copy link, Text it, Share and Go to {name} (L2-010, L2-011 AC6).
- Foundations: the domain entities this journey needs (`Person`, `PopkinSpace`, `Membership`, the sign-in code), the first EF Core migration and the `popkin` CLI (`migrate`, `seed`, `reset`) in `backend/src/Popkin.Cli/`; the tokens, `@font-face`, reset and layout utilities in `frontend/projects/components/src/lib/styles/` copied from `docs/design-system/tokens/` and `docs/design-system/assets/fonts/`; the app shell driven by route data; the API recorder `npm run record-api` in `e2e/`; `e2e/fixtures/stubs.ts` and `e2e/fixtures/parity.ts`; the not-found and server-error screens (L2-056) so unknown routes and failures are explained.
- The cross-cutting rules each slice touches: membership authorisation, input validation and encoding, abuse limits on codes, personal data protection, fast screens, WCAG 2.2 AA, responsive from 360 px, light and dark themes, optional motion, no payment or advertising.

**Stays unchanged:**

- `GET /api/health` and its test `backend/tests/Popkin.Api.Tests/HealthTests.cs`.
- The placeholder screen at `/` and `e2e/tests/home.spec.ts`; the landing page replaces them in journey 10.
- The mocks and the design system, except where Phase 1 finds a real conflict.

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

- Requirements: L2-003, L2-004, L2-005, L2-007, L2-008, L2-009, L2-010, L2-011 (AC5, AC6), L2-050 in `docs/specs/L2.md` (they trace to L1-002, L1-003, L1-004, L1-012 in `docs/specs/L1.md`).
- Detailed designs this journey realises:
  - `docs/detailed-designs/accounts/sign-up/README.md`
  - `docs/detailed-designs/accounts/confirm-code/README.md`
  - `docs/detailed-designs/accounts/sessions/README.md`
  - `docs/detailed-designs/popkins/start-popkin/README.md`
  - `docs/detailed-designs/invitations/invite-people/README.md`
- Cross-cutting designs that apply to every slice here:
  - `docs/detailed-designs/security/membership-authorisation/README.md`
  - `docs/detailed-designs/security/input-validation-and-encoding/README.md`
  - `docs/detailed-designs/security/abuse-limits/README.md`
  - `docs/detailed-designs/security/personal-data-protection/README.md`
  - `docs/detailed-designs/reliability/fast-screens/README.md`
  - `docs/detailed-designs/reliability/loading-failure-offline/README.md`
  - `docs/detailed-designs/accessibility/wcag-2-2-aa/README.md`
  - `docs/detailed-designs/accessibility/responsive-layout/README.md`
  - `docs/detailed-designs/accessibility/light-and-dark-themes/README.md`
  - `docs/detailed-designs/accessibility/optional-motion/README.md`
- Mocks (the source of truth for the UI), by screen and state as listed in `docs/mocks/manifest.json`:
  - `docs/mocks/pages/sign-up/`: default, email, invalid, submitting, error
  - `docs/mocks/pages/verify-code/`: default, invalid, expired, submitting
  - `docs/mocks/pages/name-your-popkin/`: default, blank, edge
  - `docs/mocks/pages/how-long/`: default, custom, forever, submitting, error
  - `docs/mocks/dialogs/end-date/`: default, invalid
  - `docs/mocks/pages/popkin-created/`: default, copied
  - `docs/mocks/pages/not-found/default.html` and `docs/mocks/pages/server-error/default.html`
  - `docs/mocks/notifications/toast/` for the code-sent and copy confirmations
- Known conflicts and open points to respect: the session cookie must change from `Lax` to `SameSite=Strict` (`accounts/sessions`). The SMS and email providers are `<TO SUPPLY>`: use a development sender that writes the code to the log, never a real provider. Treat L2-004 AC2's "next step of their journey" as `/new` after sign-up, or the `returnUrl` when one was given.
- If a criterion, design and mock disagree, follow the source `docs/detailed-designs/README.md` names for that
  conflict. For a new one, fix the artifact that is wrong with the skill that owns it (requirements with
  `engineering-requirements`, designs with `writing-software-design-documents`, mocks with
  `writing-html-mocks`), and note it in the design's README. Do not write tests for these artifacts.

## Phase 2: The `pk-*` components the screens need

- The mocks for this journey compose these design-system components (`docs/design-system/components/`):
  `pk-screen`, `pk-top-bar`, `pk-logo`, `pk-button`, `pk-icon-button`, `pk-link`, `pk-text-field`, `pk-segmented-control`, `pk-alert`, `pk-form-summary`, `pk-emoji-picker`, `pk-colour-picker`, `pk-choice-card`, `pk-dialog`, `pk-qr-card`, `pk-toast`, `pk-skip-link`, `pk-empty-state`.
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
  1. Foundations, proven by behaviour: tokens, fonts, reset and utilities in the components library; the app shell with `shell` and `page` route data; the not-found screen for an unknown route (a behaviour spec asserts `data-page` and the heading).
  2. Sign-up screen without a request: the questions, the Phone/Email switch that keeps the name, the field rules and announced messages, the Terms and Privacy links (L2-003 AC1, AC2, AC4 to AC7).
  3. Request a code: the domain, the first migration and `popkin migrate`, the anonymous endpoint that stores a hashed code and sends it through the sender interface, the abuse limit of five codes an hour (L2-005 AC4), and the screen's submitting and error states (L2-003 AC3, AC8). Add `npm run record-api` and record its first answers.
  4. Confirm the code: masked destination, correct code signs in and sets the session cookie, wrong code clears and counts, expired code, paste and one-time-code fill, digits only, single use, sixth attempt refused (L2-004, L2-005 AC3, AC5, L2-007 AC4, L2-050).
  5. Resend: the 30-second countdown and the new code that voids the old one (L2-005 AC1, AC2).
  6. Session guard: a visitor on a protected screen is sent to `/sign-in` with the return URL; a signed-in person keeps the session for 30 days (L2-007 AC1 to AC3). Assert the redirect only; the sign-in screen is journey 6.
  7. Name your Popkin: name field with 40-character limit and count, twelve emoji, seven colours, live preview, pressed state, defaults and the disabled button (L2-008).
  8. How long and the End date dialog: the radio group with arrow keys, the four options, the date limits of one hour to one year, the copy about changing it later (L2-009 AC1 to AC3, AC6, AC7).
  9. Pop it up: the create endpoint, the Host as first member, the unique unguessable invite code of at least 8 characters, the submitting and error states (L2-009 AC4, AC5, L2-010 AC6, L2-011 AC5).
  10. The created screen: headline, emoji in its colour, the QR code that encodes the invite link, Copy link with a 3-second announced "Copied", Text it, Share only where a share sheet exists, Go to {name} to `/p/:popkin`, and no confetti under reduced motion (L2-010 AC1 to AC5, AC7, L2-011 AC6).
  11. Server error: a failure the app cannot recover from shows the server-error screen (L2-056).
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
  its true percent complete, and the root README's overall estimate and roadmap match. `docs/estimates/` is empty today, so this journey creates it with the skill: the root README and one document per subsystem, each design at its true percent.
- Keep the requirements, designs and mocks aligned with what was built. Update `README.md` if a command,
  prerequisite or setting changed, in particular the `popkin migrate` step and the recorder.

## Deferred (not in this journey)

- The landing page and the welcome screen (journey 10); the sign-in screen (journey 6).
- The Popkin home that "Go to {name}" opens, and the Invite dialog (journey 4).
- Joining through the invite link (journey 2).
- Real SMS and email providers; they stay `<TO SUPPLY>`.
- The offline screen (journey 6, with My Popkins' offline state).

## Done means

- A visitor at `/sign-up` can sign up by phone or email, confirm the code, name a Popkin, choose its length, pop it up and see the created screen with a working QR code and invite link; they are its Host and first member.
- Codes are hashed, expire after 10 minutes, are single use and limited as L2-005 says; the session cookie is `__Host-popkin`, `Secure`, `HttpOnly` and `SameSite=Strict`.
- `popkin migrate`, `popkin seed` and `popkin reset` work against the local API's database, and the seed is idempotent.
- Every new `pk-*` component has a passing parity spec.
- Every acceptance criterion of L2-003, L2-004, L2-005, L2-007, L2-008, L2-009, L2-010, L2-011 (AC5, AC6), L2-050 that is in scope above has a passing test that proves it.
- All the new and existing tests pass: `pwsh eng/Test-Backend.ps1`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run typecheck`, `npm test` and `npm run parity`. No sweep was run.
- Docs, estimates and design artifacts agree with the code.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md` (what changed, why, the requirements it satisfies and how it was tested), with CI green. Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and anything deferred.
