# Call controls

## Overview

Popkin is a free platform for pop-up communities. Its members may hold a video call for the
whole Popkin or between two members of a direct message. The feature
[start or join a group call](../group-call/README.md) brings a member onto a call. This feature
covers what the member sees and controls once there: the tiles of the people on the call, their
own microphone and camera, leaving, and minimising the call to keep it running while using the
rest of the Popkin.

- **tile** — square on the call screen for one participant. It shows their video, or their
  avatar when the camera is off, and carries their first name.
- **speaking ring** — outline of at least 3 px in the Popkin's colour round the tile of a person
  who is speaking
- **control** — toggle button in the bar at the foot of the call screen: "Mute", "Camera" or
  "Leave"
- **minimise** — leaving the call screen for the Popkin home while the call keeps running

Each person controls only their own microphone and camera. The browser turns the local track off
at once, before any request, so no audio or video leaves the device after the press. The Popkin
API then records the new state, and the other participants show the muted icon or the avatar.
Speaking is detected in each browser from the audio it receives; the server plays no part in it.

## Description

### Screens and states

- `docs/mocks/pages/video-call/default.html` — six people in two columns, "Walt, speaking" with
  the speaking ring, Ruth and Sam with avatars, Sam muted, controls "Mute", "Camera", "Leave",
  and "Minimise call" in the top bar.
- `docs/mocks/pages/video-call/two.html` — two people in one column, side by side from 640 px (L2-030 AC1, AC8).
- `docs/mocks/pages/video-call/muted.html` — the member muted: the control reads "Unmute",
  `aria-pressed="true"`, and the member's tile shows the muted icon (L2-030 AC3, AC5).
- `docs/mocks/pages/video-call/camera-off.html` — the member's camera off: the control reads
  "Camera off" and the tile shows the avatar "MO" (L2-030 AC2, AC5).
- `docs/mocks/notifications/banner/info.html` — the Popkin home with the call banner, the screen
  "Minimise call" leads to (L2-030 AC7).

The mock banner offers "Join". Whether the banner of a member who minimised reads "Join" or
another label such as "Return" is `<TO SUPPLY>`.

### API

- `PATCH /api/popkins/{popkinId}/calls/{callId}/participants/me` with `{ micOn?: boolean,
  cameraOn?: boolean }` — `204 No Content`. Errors: `404 popkin_not_found` (L2-051 AC1),
  `404 call_not_found` when the caller is not on the call, `400` with a `code` for a malformed
  body (L2-052 AC1).
- `POST /api/popkins/{popkinId}/calls/{callId}/leave` — `204 No Content`; defined by
  [start or join a group call](../group-call/README.md).
- `PopkinHub` event `ParticipantMediaChanged(callId, membershipId, micOn, cameraOn)` on
  `call:{callId}`.

### Frontend

- **`VideoCallPage`** — the page from the group call design. This feature adds its layout rules.
  The grid is one column for two people and two columns of equal tiles for three or more
  (L2-030 AC1). It shows at most 12 tiles (L2-029 AC7). Each tile is labelled with the
  participant's first name, or "You" for the member (L2-030 AC2). The page handles `leave` and
  `minimise`.
- **`pk-call-tile`** — introduced in the `components` library, block `call-tile`, from the
  design-system page "Call tile and controls" (`docs/design-system/components/call-tile.html`).
  Inputs: `name`, `stream`, `avatar`, `muted`, `cameraOn`, `speaking`. It renders the video, or
  `pk-avatar` when the camera is off. A muted tile shows the mic-off icon with the hidden text
  "Muted,". A speaking tile takes the modifier `call-tile--speaking`, which draws the ring, and
  the hidden text ", speaking". Colour is therefore never the only carrier (L2-057 AC5). The
  surrounding list uses the block `call-grid` with the label "On the call".
- **`pk-call-controls`** — introduced in the `components` library, block `call-controls`, from
  the same design-system page. "Mute" and "Camera" are `<button aria-pressed>`. On press they
  change icon and label ("Unmute", "Camera off") and invert their fill (L2-030 AC5). "Leave" is
  the `call-control--leave` variant, labelled "Leave call". Each target is at least 44 by 44 px
  on touch (L2-057 AC4).
- **`CallSession` / `WebRtcCallSession`** — the root-provided service from the group call design.
  This feature adds `toggleMic()`, `toggleCamera()`, `leave()` and the `returnUrl` captured when
  the call opened. It also adds speaking detection: one Web Audio `AnalyserNode` per audio track,
  sampled at an interval of `<TO SUPPLY>` ms against a threshold of `<TO SUPPLY>`. Because the
  service lives in root, "Minimise call" keeps media running. Remote audio plays through detached
  audio elements while the call page is closed.
- **`CallsApi`** — gains `setMedia(popkinId, callId, micOn?, cameraOn?)`.
- **`pk-top-bar`** — carries "Minimise call" and "Invite to call" as icon buttons.

### Backend

- **`CallsController`** — gains the `PATCH …/participants/me` action.
- **`SetCallMediaCommand` / `SetCallMediaCommandHandler` / `SetCallMediaCommandValidator`** —
  introduced. Loads the caller's membership through `IMembershipGuard`. Loads their
  `CallParticipant` whose `LeftAt` is empty, or answers `404 call_not_found`. Calls
  `CallParticipant.SetMedia`, saves, and pushes `ParticipantMediaChanged` through
  `IPopkinNotifier`.
- **`CallParticipant`** — gains `SetMedia(micOn?, cameraOn?)`. The fields `MicOn` and
  `CameraOn` come from the group call design.
- **`LeaveCallCommandHandler`** — from the group call design. It ends the call when the last
  participant leaves (L2-029 AC6).

### Behaviour notes

- "Leave" stops the local tracks and closes the peer connections before the request returns,
  then opens the screen the member came from (L2-030 AC6). A failed leave request leaves the
  participant row to the hub's disconnect grace period.
- When the `PATCH` fails, the local track stays off; the device never resumes sending after a
  failure. How the failure is shown has no mock and is `<TO SUPPLY>`.
- The direct call uses the same page and controls (L2-030 AC8). Its two-person layout is one
  column.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-030` | `L1-008` | Call controls: Each person controls their own microphone and camera. |
| `L2-029` | `L1-008` | Start or join a group call: One tap puts the whole Popkin on a video call. |
| `L2-057` | `L1-014` | Accessible to WCAG 2.2 AA: Everyone can use every screen. |
| `L2-059` | `L1-014` | Light and dark themes: Popkin follows the device and the person. |

From `L2-029` this feature realises AC7 (at most 12 tiles). From `L2-057` it realises AC4 and
AC5 for the call screen, and from `L2-059` AC3 (dark in both themes).

## Diagrams

### System context

The member drives their own camera and microphone through Popkin. The media relay carries the
audio and video the controls govern.

![C4 system context for call controls](diagrams/c4-context.png)

### Containers

The web app records microphone and camera state in the Popkin API. The API pushes the change to
the other participants over `PopkinHub`.

![C4 container view for call controls](diagrams/c4-container.png)

### Components

`VideoCallPage` composes `pk-call-tile` and `pk-call-controls` and delegates to `CallSession`.
`CallsController` dispatches to `SetCallMediaCommandHandler` and `LeaveCallCommandHandler`.

![C4 component view for call controls](diagrams/c4-component.png)

### Class structure

The page depends on the `CallSession` contract, never on `WebRtcCallSession`. The two
presentation components take plain inputs. `SetCallMediaCommandHandler` mutates
`CallParticipant`.

![Class diagram for call controls](diagrams/class-structure.png)

### Behaviour — mute or turn the camera off

The track goes off locally first and the control shows its pressed state (L2-030 AC5). The
server then records the change and tells the other participants (L2-030 AC2, AC3).

![Sequence diagram for mute and camera](diagrams/sequence-toggle-mute-camera.png)

### Behaviour — lay out tiles and mark who is speaking

The page picks its columns from the participant count and the width: one for two people (two from 640 px), two for three or four, two for five or six (three from 640 px) (L2-030 AC1). Each browser measures
audio levels and rings the tile of a person who is speaking (L2-030 AC4).

![Sequence diagram for tiles and speaking](diagrams/sequence-tiles-and-speaking.png)

### Behaviour — leave or minimise a call

"Leave" ends the member's part at once and returns to the previous screen (L2-030 AC6).
"Minimise call" opens the Popkin home, keeps the call running and offers a banner back to it
(L2-030 AC7).

![Sequence diagram for leave and minimise](diagrams/sequence-leave-or-minimise.png)
