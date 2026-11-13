# Invite people

## Overview

Popkin grows by invitation. Any member of an active Popkin can bring someone in without knowing
their phone number: they show a QR code to scan, or copy an invite link to send.

- **invite code** — short unguessable or Host-chosen string that identifies one Popkin's invite
- **invite link** — URL made of the invite base address and the invite code, such as `popk.in/lakeside`
- **QR code** — two-dimensional barcode that encodes the invite link

This feature covers the "Bring someone in" dialog, opened by "Invite" on the Popkin home or by
"Invite people" in Popkin settings. The invite code itself is made when the Popkin is created
(`popkins/start-popkin`); the dialog reads it. What happens when someone opens the link belongs
to `invitations/preview-invite`.

## Description

### Screens and states

- `docs/mocks/dialogs/invite/default.html` — "Bring someone in", "They scan, they're in. No
  numbers needed.", QR code, emoji and name, `popk.in/lakeside`, "Copy invite link".
- `docs/mocks/dialogs/invite/copied.html` — the action reads "Copied", live announcement "Invite
  link copied".
- The mocks draw no loading or failure state for the dialog (the manifest marks busy and invalid
  as not applicable); while the invite loads the QR area shows `pk-skeleton`, and the failure
  copy is `<TO SUPPLY>`.

### API

- `GET /api/popkins/{popkinId}/invite` — `200` `InviteDto`. Failures: `404` `popkin_not_found`;
  `409` `popkin_wrapped_up`; `401` without a session.

### Frontend (Popkin web app)

- **`InviteDialog`** (`dialogs/invite/invite.dialog.ts`) — CDK dialog in `pk-dialog`. Under
  640 px it is a sheet fixed to the bottom of the screen; from 640 px it is centred
  (L2-011 AC4). It loads the invite with `PopkinsApi.getInvite(popkinId)` and renders
  `pk-qr-card` with the QR code, the Popkin's emoji and name and the link (L2-011 AC1).
  "Copy invite link" writes the link with `navigator.clipboard.writeText`, reads "Copied" for
  3 s and announces "Invite link copied" in a visually hidden live region (L2-011 AC2). When
  the clipboard is refused, the link text stays selectable; the message for that case is
  `<TO SUPPLY>`.
- **Closing** — Escape, "Close" and the backdrop close the dialog; CDK `restoreFocus` returns
  focus to "Invite", or to "Popkin settings" when opened from the menu (L2-011 AC3,
  L2-057 AC2).
- **`QrEncoder`** (`api` library helper) — `encode(text)` returns the module matrix that
  `pk-qr-card` draws; the matrix encodes the full invite link, so a phone camera opens it
  (L2-011 AC6). The QR encoding library is `<TO SUPPLY>`. The same helper serves
  `PopkinCreatedPage`.
- **`PopkinsApi.getInvite(popkinId)`** — `HttpPopkinsApi`, injected through `POPKINS_API`;
  returns an `InviteView`.
- **Entry points** — "Invite" on `PopkinHomePage` and "Invite people" in
  `PopkinSettingsDialog`, both shown only for an active Popkin.

### Backend

- **`PopkinsController.GetInvite`** — `GET /api/popkins/{popkinId}/invite`; sends
  `GetInviteQuery`.
- **`GetInviteQueryHandler`** — calls `IMembershipGuard.RequireMemberAsync` (`404`
  `popkin_not_found` for anyone else, L2-051 AC1), refuses a wrapped-up Popkin with
  `PopkinWrappedUpException` (`409` `popkin_wrapped_up`), and returns `InviteDto`: `Code`,
  `Url`, `PopkinName`, `Emoji`, `Colour`. Any member may read it; the invite is not Host-only
  (L2-011).
- **`InviteLinkBuilder`** — builds `Url` from `InviteOptions.BaseUrl` (configuration
  `Invites:BaseUrl`) and the code. The mocks show the short form `popk.in/{code}`; the
  production base address and how it reaches the web app route `/i/:code` (redirect or same
  host) are `<TO SUPPLY>`.
- **Invite code rules (L2-011 AC5)** — `RandomInviteCodeGenerator` draws 10 characters from
  `abcdefghjkmnpqrstuvwxyz23456789` with `RandomNumberGenerator`, which leaves out characters
  that read alike. `PopkinSpaceConfiguration` puts a unique index on `InviteCode`, and creation
  retries on a collision. A Host-chosen slug shall be at least 8 characters and unique too; the
  screen and endpoint to choose one do not exist in the mocks and are `<TO SUPPLY>`.
- **Lookups by code** — the code is matched exactly after lower-casing; the anonymous lookup and
  its rate limit live in `invitations/preview-invite`.

### Open questions settled in journey 1

- **QR encoding library** — `qrcode-generator` (MIT), at error correction H so the mark over the
  centre does not stop a camera reading it. `encodeQr()` in the `api` library wraps it.
- **Quiet zone** — the QR code's own padding is white in both themes (the design system's `.qr`
  now carries it), and a behaviour spec decodes the code from its pixels in both themes.
- **`Invites:BaseUrl`** — configuration; `https://popk.in/` locally and in tests. How the
  production address reaches `/i/:code` stays `<TO SUPPLY>`.

### Settled when the wide layouts were built

- **`pk-qr-card` sizes** — the card gained `size="lg"`. `PopkinCreatedPage` uses it from 768 px,
  where the QR code is the picture half of the split screen
  ([Start a Popkin](../../popkins/start-popkin/README.md), L2-058 AC10); a behaviour spec scans
  the code from there too (L2-011 AC6). The invite dialog keeps the base size.
- **Not built yet** — `InviteDialog` and its two entry points wait for the Popkin home
  (journey 4). Of this design, the endpoint, the invite code rules, `encodeQr()` and
  `pk-qr-card` exist.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-011` | `L1-004` | Invite with a QR code or a link: Any member invites people from the Popkin home. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-057` | `L1-014` | Accessible to WCAG 2.2 AA: Everyone can use every screen. |

## Diagrams

### System context

A member shows the QR code or copies the link; the invited person's phone camera opens the link
in Popkin.

![C4 system context for inviting people](diagrams/c4-context.png)

### Containers

The web app reads the invite from the Popkin API, which reads the Popkin's invite code from the
database; the QR code is drawn on the device.

![C4 container view for inviting people](diagrams/c4-container.png)

### Components

`InviteDialog` reads through `PopkinsApi` and draws with `QrEncoder` and `pk-qr-card`;
`GetInviteQueryHandler` checks membership and builds the link with `InviteLinkBuilder`.

![C4 component view for inviting people](diagrams/c4-component.png)

### Class structure

`InviteDto` is built from `PopkinSpace` and `InviteOptions`; `RandomInviteCodeGenerator` and the
unique index carry the code rules.

![Class diagram for inviting people](diagrams/class-structure.png)

### Behaviour — open the invite dialog

The dialog opens as a sheet or a centred dialog by width, loads the invite for a member of an
active Popkin, and draws the QR code.

![Sequence diagram for opening the invite dialog](diagrams/sequence-open-invite.png)

### Behaviour — copy the invite link and close

Copying confirms for 3 s and is announced; closing returns focus to the control that opened the
dialog.

![Sequence diagram for copying the invite link](diagrams/sequence-copy-and-close.png)
