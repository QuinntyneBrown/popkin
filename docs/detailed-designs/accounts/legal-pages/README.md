# Terms and Privacy notice

## Overview

Popkin is a platform for pop-up communities. This feature covers the two public pages a person
accepts by signing up: the Terms (`/terms`) and the Privacy notice (`/privacy`). The sign-up
screen links to them through `pk-legal` (L2-003 AC7), and the marketing site's footer links to the
Privacy notice (L2-081 AC1). They are also the Terms and Conditions URL and the Privacy Policy URL
that the toll-free verification of Popkin's SMS number asks for (ADR 0021).

- **Terms** — what a person agrees to by signing up, with a section on text messages (L2-083)
- **Privacy notice** — what Popkin keeps about a person, what for, who handles it, and how to have it erased (L2-082)
- **`<TO SUPPLY: …>`** — a fact only the owner can give: who runs Popkin, the contact address, the governing law

Both pages are fixed copy. They need no account and send no request to the API. Every word is
taken from the mocks.

## Description

- **Screens and states**
  - `docs/mocks/pages/privacy/default.html` — the Privacy notice.
  - `docs/mocks/pages/terms/default.html` — the Terms.
  - The manifest marks loading, empty and error as not applicable: the pages load no data.
- **API** — none (L2-082 AC1, L2-083 AC1).

### Front end (introduced)

- **Routes** — `privacy` and `terms` in `app.routes.ts`, with no guard, so a person signed in or not reaches them; `data` `{ shell: 'bare', page: 'privacy' }` and `{ shell: 'bare', page: 'terms' }`; titles "Privacy notice · Popkin" and "Terms · Popkin".
- **`PrivacyPage`, `TermsPage`** — `pages/privacy/` and `pages/terms/`, each `name.page.ts` and `.html`, OnPush, no stylesheet. Each composes `pk-screen` (`layout="column"`, the heading, and "Last updated 14 November 2026" as the lead), the brand `pk-top-bar` with `pk-logo` to `/` (which sends a signed-in person to My Popkins), and `pk-prose` with the page's sections, ending with a `pk-link` to the other page.
- **`legal-content.ts`** — `pages/legal-content.ts`, the fixed copy of both pages as `ProseSection` arrays (`PRIVACY`, `TERMS`) and the date they were last updated (`LEGAL_UPDATED`). The copy is the mock's.
- **`pk-prose`** — new in `components`, `prose/prose.ts`, `.html`, `.scss`, on `article[pk-prose]`: the block `.prose` of `docs/design-system/assets/components.css`. Input `sections` (`ProseSection`: a `heading` and `blocks`, each a paragraph, as a string, or a list, as an array of strings). Each section renders an `h2` (`prose__heading`), its paragraphs (`prose__text`) and lists (`prose__list`); the default slot follows the sections, ruled off (`prose__end`). The copy is rendered as text, never as HTML.

### Behaviour rules

- **Public** — neither route has a guard, and neither page injects a service that calls the API (L2-082 AC1, L2-083 AC1).
- **What the Privacy notice says** — what is collected, the phone number used only for sign-in codes and group invites, numbers and SMS opt-in data never sold or shared for marketing, Azure Communication Services and Azure Blob Storage, deleting the account and erasure within 30 days, and the contact (L2-082 AC2–AC6).
- **SMS in the Terms** — one text each time the person asks for a code and occasional group invites; "Message and data rates may apply."; STOP stops the texts and HELP gets help (L2-083 AC2). STOP and HELP are answered by the carrier and Azure Communication Services' opt-out handling for a toll-free number, not by Popkin's code.
- **Never free** — neither page says Popkin is free; the Terms say a price is shown and agreed before anything is charged (L2-082 AC7, L2-083 AC4, ADR 0019).
- **Reached from sign up** — the links of `pk-legal` already lead to `/terms` and `/privacy`; with these routes they no longer reach the not-found screen (L2-083 AC5).
- **Readable column** — `pk-screen`'s `column` layout keeps one column no wider than the form maximum from 768 px; at 360 px the text wraps and nothing scrolls sideways (L2-083 AC6, L2-058).
- **Headings** — one `h1` (the screen's), an `h2` per section; the skip link moves to `main` (L2-057 AC8).
- **Placeholders** — until the owner supplies them, the copy shows `<TO SUPPLY: legal name of who runs Popkin>`, `<TO SUPPLY: contact email>` and `<TO SUPPLY: governing law>` as written, so a missing fact is visible on the page (known gap 78).

### Tests

- Playwright behaviour specs, `e2e/tests/legal-pages.spec.ts`, through the page objects `e2e/pages/privacy.page.ts` and `e2e/pages/terms.page.ts`: each page opens at its address with its heading and the facts its criteria name; the links from sign up reach them; each links to the other; at 360 px nothing scrolls sideways.
- `routes.ts` has the `privacy` and `terms` keys.
- `pk-prose` has a parity spec, `e2e/tests/parity/prose.spec.ts`, against `privacy/default.html`.

### Open

- The owner supplies the legal name, the contact email and the governing law (known gap 78), and has the copy read by someone qualified before the toll-free verification is submitted.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-082` | `L1-012` | Privacy notice: what is collected, the phone number's one use, who handles data, deletion, contact. |
| `L2-083` | `L1-002` | Terms: SMS frequency, rates, STOP and HELP; never free; reached from sign up. |
| `L2-003` | `L1-002` | Sign up: continuing accepts the Terms and the Privacy notice, and both are links (AC7). |
