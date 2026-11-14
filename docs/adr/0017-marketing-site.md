# 0017. The marketing site

## Status

Accepted, 13 November 2026.

## Context

L1-020 asks for a public marketing site, separate from the app, that shows the pitch film "Meet
Popkin" (`docs/videos/19-meet-popkin/`) beside what the landing page already says. ADR 0002 says
a further application is added by its own decision record. The app's landing page (L2-001,
L2-002) runs inside the app: it waits for the session check, and a signed-in person who opens it
is sent to My Popkins. A page that is shared, linked from elsewhere and shows a 98-second film
gains nothing from either. Jubilee, whose stack and conventions Popkin shares, made the same
choice in its ADR 0013 and has run it since.

## Decision

- A further frontend project, `marketing`, is added to the Angular workspace at
  `frontend/projects/marketing`. It is an application like `popkin`: one root that composes
  `pk-*` components from `components`, with no presentation of its own (ADR 0007). Its one
  further component, `pk-film`, the player of the pitch film with its chapters, is built in the
  `components` library with its design-system page, its mock and its parity spec (ADR 0008).
- It is static: no router, no session, no HTTP client, no request to the API. Its copy is fixed
  in `content.ts`; the sections it shares with the landing page are composed from the same
  blocks (`pk-site-nav`, `pk-hero`, `pk-band`, `pk-steps`, `pk-uses`, `pk-compare`,
  `pk-cta-band`, `pk-site-footer`) with the same words.
- Every link to the app is built from one `APP_URL` token, set per environment in
  `environment.ts`: `https://popkin.community` in production, `http://localhost:4200` in
  development (L2-081 AC2).
- It is served at `https://about.popkin.community`. `about` is already a reserved address
  (L2-063 AC5), so no Popkin can take it. The apex keeps the app and its landing page.
- Nothing is loaded from another host (L2-061 AC2). `npm run media:sync` copies the film from
  `docs/videos/19-meet-popkin/19-meet-popkin.mp4` and the pictures from `docs/mocks/assets/images`
  into `projects/marketing/public` before the site is served or built; the copies are ignored by
  git. The film's narration is burned into the picture, so the player adds no caption track.
- `npm run start:marketing` serves it on port 4201 and `npm run build:marketing` builds it. The
  e2e suite starts it as a second web server, opens it by absolute address and fails a request
  that leaves `localhost`.

## Consequences

- The marketing page can change without touching the app, and the app's bundle is unaffected.
- The landing page and the marketing page say the same things in the same words. A change to
  that copy is made in both, and in both mocks, until a later record retires one of them.
- The site is built and deployed with the frontend image and chosen by host behind the same proxy
  (ADR 0013); `docs/deployment.md` names its host and its build.
- Until the film is rendered, `media:sync` copies nothing for it and the player shows its still
  and its chapters; pressing play then finds no film. The behaviour specs do not depend on the
  film's file.
