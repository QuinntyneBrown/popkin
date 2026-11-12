# Say you are keen

## Overview

Popkin is a free platform for pop-up communities. Members of a *Popkin*, a private space for one
group, share *experiences*. Some are things the group did; others are ideas for next time, of
kind "Want to do". An idea has nothing to rate yet, so instead of a score it collects the members
who are keen on it. This feature lets a member say they are keen, take it back, and lets the
sharer or the Host record that the group did it.

- **keen** — interest one member shows in one "Want to do" experience; a member is keen or not,
  never more than once
- **keen panel** — tinted card on the detail page of a "Want to do" experience that asks "Keen
  to do this?", shows who is keen and holds the keen button
- **We did this** — action that turns a "Want to do" experience into "Something we did", after
  which members can rate it

The keen panel takes the place of the rating panel of
[Rate an experience](../rate-experience/README.md) on the page described in
[View an experience](../view-experience/README.md). Cards in
[List experiences](../list-experiences/README.md) show the keen count ("7 keen") instead of a
score.

The designs show only the count. How a member says they are keen is open question 4 of
`docs/mocks/README.md` and an assumption of `docs/specs/L1.md`. This design follows the mock and
L2-042, and marks every detail neither settles as `<TO SUPPLY>`.

## Description

### Screens and states

- `docs/mocks/pages/experience-detail/want.html` — "Beach day next summer?", "Want to do ·
  Idea", "Shared by Ellie"; the keen panel with "Keen to do this?", a stack of four avatars
  ending "+3", "7 keen" and "I'm keen" with `aria-pressed="false"`; "What people said" with two
  comments without stars.
- `docs/mocks/pages/experiences/default.html` and `want.html` — the card foot reads "7 keen".
- No mock shows:
  - the pressed state "You're keen";
  - the "We did this" control and where it sits;
  - the failure message;
  - the page after an experience becomes "Something we did".
  Each is `<TO SUPPLY>`. The text of the pressed state comes from L2-042 AC2.

### API

- `PUT /api/popkins/{popkinId}/experiences/{experienceId}/keen` → `200` with `KeenDto` (count,
  whether the caller is keen, the first four keen members). Repeating it changes nothing.
- `DELETE /api/popkins/{popkinId}/experiences/{experienceId}/keen` → `200` with `KeenDto`.
- `POST /api/popkins/{popkinId}/experiences/{experienceId}/done` → `200` with
  `ExperienceDetailDto`.
- Refusals: `401` without a session; `404` `popkin_not_found` (L2-051) or
  `experience_not_found`; `409` `experience_not_wanted` when the kind is not "Want to do"; `409`
  `popkin_wrapped_up` (L2-045 AC2); for `done`, `403` `not_experience_sharer` when the caller is
  neither the sharer nor the Host (L2-051 AC4).

### Frontend (`frontend/projects/`)

- **`ExperienceDetailPage`** — for kind "Want to do", renders the keen panel in place of the
  rating panel and the score card (L2-042 AC1). Its `keen` signal holds a `KeenView`.
  - `toggleKeen()` disables the button while the request runs, calls
    `ExperiencesApi.setKeen(..., !iAmKeen)` and replaces the `KeenView` with the answer.
  - The button is a toggle button. `aria-pressed="true"` and the label "You're keen" when the
    member is keen; `aria-pressed="false"` and "I'm keen" otherwise (L2-042 AC2, AC3). The
    pressed state is carried by text as well as styling.
  - On failure the previous state stays and a danger toast says so (copy `<TO SUPPLY>`).
  - `markDone()` is offered when `CanMarkDone` is true. It replaces the whole detail with the
    answer, so the rating panel and an empty score card appear (L2-042 AC4).
- **`KeenView`** — count text ("7 keen"), whether the member is keen, the button label, up to
  four avatars and the "+N" remainder.
- **`ExperiencesApi.setKeen`, `.markDone`**.
- **Components**: `pk-card` (tinted panel), `pk-avatar` in its stack variant (`avatar-stack`,
  `avatar--ring`, `avatar-stack__more`), `pk-button` (Popkin) with `aria-pressed`. The avatar
  stack is hidden from assistive technology; the count text carries the information.

### Backend (`backend/src/`)

- **`SetKeenCommand`** / **`SetKeenCommandHandler`** —
  1. calls `IMembershipGuard.RequireMembershipAsync(popkinId)`;
  2. loads `PopkinSpace`, `Experience` and the caller's `ExperienceKeen`;
  3. refuses a wrapped-up Popkin and a kind other than `WantToDo` with `409`;
  4. calls `Experience.AddKeen(membershipId, now)` or `RemoveKeen(membershipId)`, both of which
     do nothing when the member is already in the requested state, so a repeated request is
     safe;
  5. saves and returns the count and the first four keen members, oldest `At` first.
- **`ExperienceKeen`** — primary key `(ExperienceId, MembershipId)`, which keeps one keen record
  per member and experience.
- **`MarkExperienceDoneCommand`** / **`MarkExperienceDoneCommandHandler`** — allows the sharer
  or a member with `MemberRole.Host` (`Experience.CanBeMarkedDoneBy`), refuses a wrapped-up
  Popkin, and calls `Experience.MarkDone`, which sets `Kind` to `Did`.
- Whether sharing a "Want to do" experience makes the sharer keen is `<TO SUPPLY>`. The mock's
  stack starts with Ellie, the sharer. Whether keen records stay or are removed when the
  experience is marked done is also `<TO SUPPLY>`; the design keeps them.

### Open points

- How a member comments on a "Want to do" experience is `<TO SUPPLY>`. The mock shows comments
  without stars there, and a comment otherwise belongs to a rating
  ([Comment on an experience](../comment-on-experience/README.md)).
- Whether the keen count updates live for other members is `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-042` | `L1-010` | Say you are keen: Members show interest in something the group wants to do. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

## Diagrams

### System context

A member says they are keen on an idea in Popkin; the sharer or the Host marks it as done. No
external system takes part.

![C4 system context for saying a member is keen](diagrams/c4-context.png)

### Containers

The web app sets keen or marks done through the Popkin API, which writes `ExperienceKeen` rows
and the experience's kind to the Popkin database.

![C4 container view for saying a member is keen](diagrams/c4-container.png)

### Components

`ExperienceDetailPage` composes the keen panel and calls `HttpExperiencesApi`. Two handlers,
`SetKeenCommandHandler` and `MarkExperienceDoneCommandHandler`, apply the change to
`Experience`.

![C4 component view for saying a member is keen](diagrams/c4-component.png)

### Class structure

An `Experience` owns its `ExperienceKeen` records and exposes `AddKeen`, `RemoveKeen` and
`MarkDone`. The page shows a `KeenView` built from `KeenDto`.

![Class diagram for saying a member is keen](diagrams/class-structure.png)

### Behaviour — say keen

`PUT` adds the caller's keen record and `DELETE` removes it. The button's pressed state, label
and the count follow the answer (L2-042 AC2, AC3). A "Want to do" kind and an active Popkin are
required.

![Sequence diagram for saying a member is keen](diagrams/sequence-toggle-keen.png)

### Behaviour — "We did this"

The sharer or the Host turns the experience into "Something we did"; anyone else receives `403`.
The page then shows the rating panel (L2-042 AC4).

![Sequence diagram for marking an experience as done](diagrams/sequence-mark-done.png)
