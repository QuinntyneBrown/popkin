# View the landing page

## Overview

Popkin is a free platform for pop-up communities. A *Popkin* is a private space for one group,
with a name, an emoji, a colour, members and a length. Before a person has an account, the only
parts of Popkin they reach are public screens. This feature covers the two public screens that
introduce Popkin and send a person onward: the landing page and the welcome screen.

- **landing page** — public page at `/` that explains Popkin in six sections and offers "Start a Popkin" and "Sign in"
- **welcome screen** — public phone-width screen at `/welcome` with "Start a Popkin", "Join with a code" and "Already have an account? Sign in"; the screen a person sees after signing out (L2-048 AC5)
- **Visitor** — someone without a session, as defined in `docs/specs/L1.md`
- **section** — one band of the landing page: the hero, how it works, ideas, the comparison with a group chat, the statement that it is free, and the footer

The landing page is the front door of the *landing* subsystem. It loads no data of its own: every
word, idea and comparison row is fixed copy taken from the mock. The only request it depends on
is the session check that decides whether a signed-in person is sent to My Popkins instead
(L2-002 AC3). The page also carries Popkin's promise to stay free, with no ads and no premium
tier (L2-061 AC3), and loads no third-party advertising or tracking script (L2-061 AC2).

The repository today answers `/` with a placeholder `HomePage` (`pages/home/home.page.ts`, route
data `{ shell: 'bare', page: 'home' }`). This design replaces that route with `LandingPage`.

## Description

The slice is front-end heavy. The backend contributes only the session check, which the sessions
feature (`docs/detailed-designs/accounts/sessions`) owns.

- **Screens and states**
  - `docs/mocks/pages/landing/default.html` — the only landing state; the manifest marks loading, empty and error as not applicable because the page loads no data.
  - `docs/mocks/pages/welcome/default.html` — the only welcome state.
- **API**
  - `GET /api/auth/session` — 200 `SessionDto` for a live session; 401 otherwise (no `code`; the fallback policy answers). Owned by the sessions feature and called here only through `SessionStore`.

### Front end (introduced)

- **Routes** — `app.routes.ts` gains `{ path: '', component: LandingPage, canActivate: [signedOutGuard], data: { shell: 'bare', page: 'landing' }, title: 'Popkin' }` and `{ path: 'welcome', component: WelcomePage, data: { shell: 'bare', page: 'welcome' } }`, both lazy-loaded. The placeholder `HomePage` route and folder are removed. Both routes stay public (L2-007 AC3).
- **`LandingPage`** — `pages/landing/landing.page.ts` and `landing.page.html`, selector `pk-landing-page`, OnPush, no stylesheet. It composes the six sections in the order L2-001 states. It holds the four ideas as `IdeaView` values (Small group 🕯️ Amber "Keeps going", Hackathon 💻 Sky "One weekend", Team ⚽ Leaf "One season", Family trip 🏖️ "Ten days") and the five comparison rows as `ComparisonRowView` values (Joining, Photos, Plans, Video, The end). It reads `ActivatedRoute.fragment` and, for `how` or `ideas`, scrolls the section into view and moves focus to its heading (L2-002 AC5).
- **`WelcomePage`** — `pages/welcome/welcome.page.ts` and `.html`, selector `pk-welcome-page`. It shows the wordmark, the headline "Your people, popped up in seconds.", and three actions: "Start a Popkin" (`/sign-up`), "Join with a code" (`/join`), "Already have an account? Sign in" (`/sign-in`).
- **`signedOutGuard`** — `guards/signed-out.guard.ts`, a `CanActivateFn`. It awaits `SessionStore.ensureLoaded()` and returns a `UrlTree` for `/popkins` when a session exists (L2-002 AC3); otherwise it allows the route.
- **`SessionStore`**, **`AuthApi`** / **`AUTH_API`** / **`HttpAuthApi`** — introduced by the sessions feature; this slice reads them only.
- **Components (from `docs/design-system/components/`)** — `pk-skip-link`, `pk-site-navigation` (site header with logo, "How it works", "Ideas", "Sign in", "Start a Popkin"; and the site footer), `pk-logo`, `pk-button`, `pk-popkin-tile`, `pk-avatar`, `pk-time-left`, `pk-link`.
- **Landing blocks without a component page** — the mock and `docs/design-system/assets/components.css` define the blocks `hero`, `steps`, `uses` / `use`, `compare` and `cta-band`, but `docs/design-system/components/` has no page for them. ADR 0007 places all presentation in the `components` library, so each block needs a `pk-*` component. Their names and design-system pages are `<TO SUPPLY>`.

### Behaviour rules

- **Section order and copy** — the hero ("Your people, popped up in seconds.", one paragraph, "Start a Popkin", "Free. Takes about a minute.", a Lakeside Weekend preview), "Scan. Join. You're in." with three numbered steps, the ideas, "Better than a group chat.", "Free. Like, actually free.", and the footer (L2-001 AC1–AC3).
- **Comparison table** — a `table` with a visually hidden caption. The group chat and Popkin columns are told apart by an icon and a column heading, never by colour alone (L2-001 AC4, L2-057 AC5).
- **Hero preview** — illustrative fixed content, as in the mock: the tile emoji, avatars and photos are hidden from assistive technology (empty `alt`, `aria-hidden`), the name "Lakeside Weekend", "14 here" and "Wraps up Sunday" stay readable, and the QR is an image named "QR code for popk.in/lakeside" (L2-057 AC6).
- **Responsive layout** — below 768 px the hero, steps and ideas stack in one column with no sideways scroll (L2-001 AC5). From 1024 px the hero places text beside the preview and the ideas show four across (L2-001 AC6). Columns live inside a container no wider than 72 rem (L2-058 AC5).
- **Navigation below 640 px** — the header shows the logo and "Start a Popkin"; "Sign in" moves to the footer (L2-002 AC4). The mock realises this with the `only-md` and `only-sm` utilities.
- **Actions** — every "Start a Popkin" (navigation, hero, closing band) routes to `/sign-up` (L2-002 AC1). "Sign in" routes to `/sign-in` (L2-002 AC2).
- **Footer links** — Safety, Privacy and Help have no pages; they lead to the not-found screen until they do, as the mock notes.
- **Free and ad-free** — the closing band states "No ads, no premium tier". The page loads only first-party scripts and self-hosted fonts; the content security policy of L2-054 AC1 forbids third-party script sources (L2-061 AC2).
- **Signed-in redirect on other public screens** — whether `/welcome`, `/sign-up` and `/sign-in` also redirect a signed-in person to My Popkins is `<TO SUPPLY>`; the specs require it for the landing address only.

### Tests

- Playwright behaviour specs drive `LandingPage` and `WelcomePage` through page objects `e2e/pages/landing.page.ts` and `e2e/pages/welcome.page.ts`. `GET /api/auth/session` is answered from the recording (401 for a visitor) or a stub (200 for a signed-in person).
- `routes.ts` gains the `landing` and `welcome` keys.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-001` | `L1-001` | Landing page content: The landing page explains Popkin to a visitor in six sections, in this order: the hero, how it works, ideas, the comparison with a group chat, the statement that it is free, and the footer. |
| `L2-002` | `L1-001` | Landing page actions: The landing page offers one primary action, starting a Popkin, and a way in for people who have an account. |
| `L2-061` | `L1-015` | No payment and no advertising: Popkin costs nothing and sells nothing. |

## Diagrams

### System context

A Visitor reaches the landing page without an account. A Member who opens the same address is
sent on to My Popkins.

![C4 system context for viewing the landing page](diagrams/c4-context.png)

### Containers

The Popkin web app serves both screens. Its only call to the Popkin API is the session check
that the guard needs.

![C4 container view for viewing the landing page](diagrams/c4-container.png)

### Components

The routes run `signedOutGuard` before `LandingPage`. The guard reads `SessionStore`, which
loads the session once through `AuthApi`. Both pages compose `pk-*` components only.

![C4 component view for viewing the landing page](diagrams/c4-component.png)

### Class structure

`LandingPage` owns the fixed idea and comparison view models. The guard depends on
`SessionStore`, which reaches `AuthController` through the `AuthApi` contract.

![Class diagram for viewing the landing page](diagrams/class-structure.png)

### Behaviour — open the landing page

The guard resolves the session first. A live session redirects to `/popkins` (L2-002 AC3); a 401
renders the six sections. Each "Start a Popkin" and "Sign in" routes onward (L2-002 AC1, AC2).

![Sequence diagram for opening the landing page](diagrams/sequence-open-landing.png)

### Behaviour — jump to a section

A navigation link sets the fragment. `LandingPage` scrolls the section into view, without
animation when reduced motion is preferred, and moves focus to its heading (L2-002 AC5).

![Sequence diagram for jumping to a landing section](diagrams/sequence-jump-to-section.png)
