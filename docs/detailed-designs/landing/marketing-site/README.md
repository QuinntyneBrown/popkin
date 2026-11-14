# Marketing site

## Overview

Popkin is a platform for pop-up communities. This feature covers the marketing site, a
public page separate from the app that says what the landing page says and shows the pitch film
"Meet Popkin" (`docs/videos/19-meet-popkin/`), then sends a person to the app to start a Popkin or
sign in.

- **marketing site** — the static Angular application `marketing`, served at `https://about.popkin.community` (ADR 0017)
- **pitch film** — "Meet Popkin", 1:38, narrated, its captions burned into the picture
- **chapter** — a named time in the film the visitor can jump to: "0:00 Getting everyone together", "0:16 Meet Popkin", "1:08 A proper send-off"
- **`APP_URL`** — the app's address, the one place every link to the app is built from (L2-081 AC2)

The site needs no account and calls no API. Every word is fixed copy taken from the mock; the
sections it shares with the landing page use the landing page's blocks and its words (L2-079
AC3), so the two read the same.

## Description

- **Screens and states**
  - `docs/mocks/pages/marketing-home/default.html` — the page before the film plays.
  - `docs/mocks/pages/marketing-home/playing.html` — the film playing from its second chapter, marked current.
  - The manifest marks loading, empty and error as not applicable: the page loads no data.
- **API** — none (L2-081 AC4).

### Front end (introduced)

- **Project** — `frontend/projects/marketing`, an application in `angular.json` with the `pk` prefix, `npm run start:marketing` (port 4201) and `npm run build:marketing`. Its styles are the foundations of `components` (`tokens.css`, `ui.css`) and nothing else. It imports `components` and `api` through the workspace's `paths`.
- **`App`** — `src/app/app.ts` and `app.html`, selector `pk-root`, OnPush. It has no router, no HTTP client and no stylesheet; it composes `pk-skip-link`, `pk-site-nav`, `pk-site-main`, `pk-hero`, `pk-band`, `pk-film`, `pk-steps`, `pk-uses`, `pk-compare`, `pk-cta-band` and `pk-site-footer`, in the order of L2-079 AC1. `body` carries `data-page="marketing-home"`, the e2e anchor.
- **`content.ts`** — the fixed copy: the hero's preview (the landing page's Lakeside Weekend, its QR code encoded by `encodeQr`), the steps, the ideas, the comparison rows and the film (`FILM`: its source, its still, "1:38" and the three chapters at 0, 16 and 68 seconds).
- **`APP_URL`** — an `InjectionToken<string>` provided in `app.config.ts` from `environment.ts`: `https://popkin.community`, replaced by `environment.development.ts` (`http://localhost:4200`) in the development build. `App` builds `${APP_URL}/sign-up`, `/sign-in`, `/safety`, `/privacy` and `/help` from it.
- **`pk-film`** — new in `components`, `film/film.ts`, `.html`, `.scss`, the block `.film` of `docs/design-system/components/film.html`. Inputs: `src`, `still`, `label` ("Meet Popkin"), `playLabel` ("Play the Popkin film"), `length` ("1:38") and `chapters` (`FilmChapter`: `at` in seconds, `time`, `title`). It holds two signals, `playing` and `current`. Before play it shows the still as a button over a `video` with `preload="none"` and no controls; play or a chapter sets `currentTime`, shows the controls, calls `play()` (a refusal is ignored: the controls are there) and moves focus to the video (L2-080 AC1–AC3, AC6).
- **`play` icon** — added to the icon set for the play mark.
- **Jumps** — "How it works", "Ideas" and "Watch the film" are links to `#how`, `#ideas` and `#film`. Each also calls `jumpTo`, which brings the band's heading (`{anchor}-h`) into view, smoothly unless reduced motion is preferred, and moves focus to it, so a link chosen twice jumps again (L2-080 AC4, L2-081 AC3). The bands of those three sections have an `anchor`.

### Behaviour rules

- **Order** — the navigation, the hero, "See Popkin in action.", the steps, the ideas, the comparison, the closing band and the footer (L2-079 AC1).
- **Same words as the landing page** — the hero, the steps, the ideas, the comparison and the closing band are the landing page's, so L2-001 AC2–AC4 and L2-061 AC3 hold here too (L2-079 AC2, AC3). The hero adds "Watch the film" beside "Start a Popkin".
- **Nothing before play** — the film has `preload="none"`; the still is an `img`. No request for the film is made until play or a chapter is pressed (L2-080 AC1).
- **Captions** — the narration is in the picture; the player adds no `track` (L2-080 AC5).
- **Links to the app** — absolute addresses from `APP_URL`, never relative ones; no link to the app is built anywhere else (L2-081 AC1, AC2).
- **Navigation below 640 px** — as on the landing page, the header keeps the logo and "Start a Popkin"; "Sign in" is in the footer at every width (L2-079 AC6). `pk-site-nav-link` owns this.
- **Responsive layout** — the landing page's blocks already stack below 768 px and set the hero side by side and four ideas across from 992 px; the film is the width of the container and its chapters stack below 576 px (L2-079 AC5).
- **First party only** — the page requests nothing from another host: the film, its still and the pictures are copied into `public/` by `npm run media:sync`, and the fonts are self-hosted (L2-081 AC4, L2-061 AC2).
- **Theme** — the page follows the device's theme through the tokens, as the landing page does.

### Tests

- Playwright behaviour specs, `e2e/tests/marketing-home.spec.ts`, drive the site through the page object `e2e/pages/marketing-home.page.ts`: the order of the sections and their copy, the film before play, play and a chapter, the jump to the film and to a section, every link to the app at `APP_URL`, nothing requested from another host and no API request, and the layout at 360 px and 1024 px.
- The site is a second web server of the suite (`npm run start:marketing --prefix ../frontend`, port 4201); the specs open it by absolute address. The film's file is not needed: the route that would serve it is answered by the spec, which also proves no request was made before play.
- `routes.ts` has the `marketingHome` and `marketingHomePlaying` keys.
- `pk-film` has a parity spec, `e2e/tests/parity/film.spec.ts`, against `marketing-home/default.html`.

### Open

- The still is a picture of the mocks, `bonfire.jpg`, until a frame of the film replaces it.
- Whether the app's landing page stays once the marketing site is live is not decided (ADR 0017).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-079` | `L1-020` | Marketing home page: one page that says what the landing page says and shows the film after the hero. |
| `L2-080` | `L1-020` | Pitch film player: a still until play, chapters marked current, captions in the picture. |
| `L2-081` | `L1-020`, `L1-015` | From the marketing site to the app: every link to the app from one address; no API, nothing from another host. |
| `L2-061` | `L1-015` | No advertising. |
