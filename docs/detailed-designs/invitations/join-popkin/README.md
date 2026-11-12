# Join a Popkin

## Overview

Joining a Popkin asks one thing: how the person wants to be known in it. After choosing "Join"
on an invite preview (`invitations/preview-invite`), a signed-in person gives a display name and,
if they like, a photo, and becomes a member. A welcome screen greets them, and the members
already inside are told.

- **display name** — name a member goes by inside one Popkin, stored on their `Membership`
- **profile photo** — optional picture shown as the member's avatar inside that Popkin
- **system message** — chat message written by Popkin, not by a member (`MessageKind.System`)
- **popped in** — Popkin's word for a person joining

The joiner's display name starts as their account name and may differ from it. A member without
a photo appears everywhere as initials on a colour that stays the same for them. The group learns
of the newcomer twice: a system message in the Everyone thread at the time they joined, and an
info toast for members who have the Popkin open.

## Description

### Screens and states

- `docs/mocks/pages/your-profile/default.html` — Popkin tile and name, "How should people know
  you?", initial avatar, "A photo is optional", "Your name" with hint "First name is plenty.",
  "I'm in".
- `docs/mocks/pages/your-profile/with-photo.html` — photo replaces the initial, "Looking good."
- `docs/mocks/pages/your-profile/invalid.html` — "Enter a name so people know who you are."
- `docs/mocks/pages/your-profile/submitting.html` — "Joining…".
- `docs/mocks/pages/your-profile/error.html` — "We couldn't add you just yet. Your name and photo
  are still here. Give it another go."
- `docs/mocks/pages/youre-in/default.html` — "Welcome in, Joel!", "You're now part of Lakeside
  Weekend, with Mara, Walt and 12 others.", "Say hi to everyone", "See the photos".
- `docs/mocks/notifications/toast/info.html` — "Joel popped in", "Say hi in the chat.", "Say hi".

### API

- `POST /api/invites/{code}/join` — `multipart/form-data` with `displayName` and an optional
  `photo`. `201 Created` with `JoinedDto`, or `200` with `JoinedDto` when the caller is already an
  active member. Failures: `400` `display_name_required`, `display_name_too_long`,
  `photo_type_not_allowed`, `photo_too_large`; `404` `invite_not_found`; `409`
  `popkin_wrapped_up`; `401` without a session.
- Real time: `MemberJoined` and `MessageSent` to group `popkin:{popkinId}`.

### Frontend (Popkin web app)

- **`YourProfilePage`** (`pages/your-profile/your-profile.page.ts`, route `/i/:code/profile`,
  `data-page="your-profile"`, `signedInGuard`) — reads the Popkin's name and look from
  `JoinInviteState`, or loads the preview again when it holds none. It composes
  `pk-popkin-tile`, `pk-photo-picker` (marked optional) with `pk-avatar`, `pk-text-field`
  "Your name" prefilled with the session's account name from `AuthApi` (L2-013 AC1),
  `pk-alert` and `pk-button` "I'm in".
  - The photo picker accepts JPEG, PNG, WebP or HEIC up to 10 MB and refuses anything else with a
    message (L2-013 AC2); the message copy is `<TO SUPPLY>`. The chosen photo replaces the
    initial in the preview.
  - "I'm in" is disabled while the trimmed name is empty, and the field shows the `invalid` mock
    message (L2-013 AC3).
  - While joining, the button reads "Joining…" and is disabled (L2-013 AC4); on success the page
    stores the `JoinedView` in `JoinInviteState` and opens `/i/:code/welcome`.
  - On failure the name and photo stay, `pk-alert` shows the `error` mock message, and "I'm in"
    is enabled again (L2-013 AC5).
- **`YoureInPage`** (`pages/youre-in/youre-in.page.ts`, route `/i/:code/welcome`, as the mock
  manifest gives it) — "Welcome in, {name}!" and the sentence that names two members and counts
  the rest (L2-014 AC1), with `pk-avatar`s around `pk-popkin-tile`. "Say hi to everyone" opens
  `/p/:popkinId/chat/everyone` with router state `focus: 'composer'`, which the group chat page
  uses to focus the message field (AC2). "See the photos" opens `/p/:popkinId/photos` (AC3).
  The confetti burst plays only under `prefers-reduced-motion: no-preference` (AC5, L2-060).
  After a reload, with no `JoinedView` held, the page opens `/i/:code`, which sends a member to
  the Popkin home (L2-012 AC4).
- **`MemberJoinedToast`** (`toasts/`) — shown by `Toaster` through `pk-toast` (info) when
  `PopkinRealtime` delivers `MemberJoined` on any screen of that Popkin, except to the joiner. It
  reads "{name} popped in", "Say hi in the chat." with action "Say hi" (opens the Everyone
  thread) and dismisses after 8 s, pausing on hover or focus (L2-056 AC7).
- **`InvitesApi.join(code, displayName, photo)`** — `HttpInvitesApi` sends `FormData`.

### Backend

- **`InvitesController.Join`** — authenticated (not anonymous); request size limit above 10 MB
  for the multipart body; sends `JoinPopkinCommand`.
- **`JoinPopkinCommandValidator`** — trims `DisplayName`; refuses it empty or longer than 40
  characters. The 40-character limit follows the account name of L2-048; L2-013 states none, so
  confirmation is `<TO SUPPLY>`. The photo is refused above 10 MB, and its type is decided by
  `ImageSniffer` from the file's leading bytes, whatever its name or declared type says
  (L2-052 AC3).
- **`JoinPopkinCommandHandler`**:
  1. loads the `PopkinSpace` by `InviteCode` (`404` `invite_not_found`) and refuses a wrapped-up
     one with `409` `popkin_wrapped_up` (L2-045 AC2);
  2. returns `200` with the existing membership when the caller is already an active member, so
     a retried "I'm in" after a lost response does not fail;
  3. stores the photo through `IPhotoStore.SaveAsync`;
  4. calls `PopkinSpace.Join`, which adds a `Membership` with `Role = Member`, the display name,
     `JoinedAt` = now from `TimeProvider`, and `InvitedByMembershipId` = the Host's membership;
     a former member (`LeftAt` set) gets a new `Membership`;
  5. adds `Message.PoppedIn` to the Everyone thread: `Kind = System`, text "{name} popped in.
     Say hi! 👋", `SentAt` = `JoinedAt` (L2-014 AC4), and sets `LastActivityAt`;
  6. saves in one unit of work, then calls `IPopkinNotifier.MemberJoined` and `MessageSent`.
- **Profile photo storage** — the photo is stored through `IPhotoStore` under an avatar key and
  is not added to the album. Whether `Membership.PhotoId` references a `Photo` row or a separate
  avatar record is `<TO SUPPLY>`.
- **`AvatarAccent.For(personId)`** (`Popkin.Domain`) — maps a person to one of the seven
  colours with a stable hash; every `AvatarDto` carries it with the initials, so a member without
  a photo keeps one colour everywhere (L2-013 AC6).
- **`JoinedDto`** — `PopkinId`, `MembershipId`, `DisplayName`, `PopkinName`, `Emoji`, `Colour`,
  `NamedMembers` (two other members' first names, Host first) and `OthersCount`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-013` | `L1-004` | Join with a name and an optional photo: Joining asks only how the person wants to be known in this Popkin. |
| `L2-014` | `L1-004` | Welcome a new member: A new member is welcomed and the group is told. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |

## Diagrams

### System context

The person joins through Popkin, and Popkin tells the members already there.

![C4 system context for joining a Popkin](diagrams/c4-context.png)

### Containers

The web app sends the name and photo; the Popkin API stores the photo in the photo store, writes
the membership and system message, and pushes events to the other members' web apps.

![C4 container view for joining a Popkin](diagrams/c4-container.png)

### Components

`YourProfilePage` calls `InvitesApi`; `JoinPopkinCommandHandler` validates, stores the photo,
saves and notifies; `PopkinRealtime` raises the toast for other members.

![C4 component view for joining a Popkin](diagrams/c4-component.png)

### Class structure

`PopkinSpace.Join` creates the `Membership`, `Message.PoppedIn` creates the system message, and
`ImageSniffer` decides the photo's real type.

![Class diagram for joining a Popkin](diagrams/class-structure.png)

### Behaviour — join with a name and an optional photo

The page validates on the device, the handler validates again, refuses a wrapped-up Popkin,
returns an existing membership unchanged, and otherwise creates the membership and the "popped
in" note.

![Sequence diagram for joining a Popkin](diagrams/sequence-join.png)

### Behaviour — welcome a new member

The new member is greeted and offered the Everyone thread or Photos; other members receive the
"popped in" toast.

![Sequence diagram for welcoming a new member](diagrams/sequence-welcome.png)
