# 0033. The Popkin web app is installable, by a web app manifest and no service worker of its own

## Status

Accepted, 17 November 2026. Settles known gap 146 of the
[detailed designs](../detailed-designs/README.md), raised by
[Reach Quick Add](../detailed-designs/contacts/reach-quick-add/README.md). The owner chose a
manifest with no service worker on 17 November 2026.

## Context

L2-177 AC1 asks for two shortcuts on Popkin's icon on a phone's home screen: "Add someone",
which opens Quick Add, and "Contacts", which opens Today. A phone lists an app's shortcuts from
the `shortcuts` of its web app manifest, and only for an app added to the home screen. The
Popkin web app (ADR 0002) has no manifest, so it cannot be installed and has no shortcuts. A
manifest also changes what Popkin is on a phone: added to the home screen it opens in its own
window, without the browser's address bar.

Chrome and Edge install a web app that has a manifest with a name, icons of 192 and 512 pixels, a
`start_url` and a `display` mode; since Chrome 108 they need no service worker with a `fetch`
handler. Safari on iPhone adds any page to the Home Screen, reads the manifest's name, icons and
`display`, and shows no shortcuts. The web app's only service worker, `push-worker.js`, is
registered when phone notifications are turned on (ADR 0028) and caches nothing.

## Decision

- **One manifest.** `frontend/projects/popkin/public/manifest.webmanifest`, served at
  `/manifest.webmanifest` and linked from `index.html`: `name` and `short_name` "Popkin",
  `id` and `scope` "/", `start_url` "/popkins" (My Popkins, which sends a signed-out person to
  sign-in), `display` "standalone", `theme_color` the coral accent and `background_color` the
  paper canvas of the light theme.
- **Icons are files.** `public/icons/` holds the Popkin mark on coral at 192 and 512 pixels, a
  512-pixel maskable icon with the mark inside the safe zone, and a 96-pixel icon per shortcut.
  They are drawn from the mark of the design system's logo; a change to the mark redraws them.
  `index.html` also links the 192-pixel icon as the page icon and the Apple touch icon.
- **Two shortcuts, in the requirement's words.** "Add someone" opens `/contacts/quick-add` and
  "Contacts" opens `/contacts` (L2-177 AC1). A shortcut is added or renamed only with its
  requirement.
- **No service worker for installing.** Popkin registers none to be installable and caches
  nothing for it; an app that opens without a connection stays the work of Reliability
  (L2-058), decided by its own record if it needs one.
- **Every host serves it.** Caddy serves the same files on the apex and on every Popkin's own
  address, so an install from an address host starts on that host; the manifest is served as
  `application/manifest+json` (`infra/web/Caddyfile`).
- **Its behaviour is tested.** A Playwright test reads `/manifest.webmanifest` and opens each
  shortcut's address, as L2-177 AC1 asks; the phone's own menu cannot be driven from a browser.

## Consequences

- On Android and in desktop Chrome and Edge, a person can install Popkin and long-press its icon
  for the two shortcuts. Safari on iPhone shows no shortcuts; Quick Add stays a link away there.
- An installed Popkin opens in its own window. Links that leave `scope` open in the browser.
- The icons are committed images, kept in step with the mark by hand.
- The admin app (ADR 0024) and the marketing site (ADR 0017) get no manifest.
