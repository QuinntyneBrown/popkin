# Rate an experience

## Overview

Popkin is a free platform for pop-up communities. Members of a *Popkin*, a private space for one
group, share *experiences* and rate them. This feature lets a member give an experience their
own rating and change it later.

- **rating** — one member's judgement of one experience, from one to five stars; a member holds
  at most one rating per experience
- **rating panel** — tinted card on the experience detail page that asks "How was it for you?"
  and holds five star buttons
- **rateable experience** — experience of kind "Something we did" or "Restaurant"; a "Want to
  do" experience has no rating panel and is not rateable until it becomes "Something we did"
  (see [Say you are keen](../say-keen/README.md))

The rating panel sits on the page described in [View an experience](../view-experience/README.md),
below the score card. Every rating feeds the group score that page shows. After rating, the panel
offers "Add a comment", which opens the dialog of
[Comment on an experience](../comment-on-experience/README.md).

The page applies a rating as soon as the member chooses a star and puts it back if saving fails.
The member sees the result at once and never loses track of what was saved.

## Description

### Screens and states

- `docs/mocks/pages/experience-detail/default.html` — not yet rated: "How was it for you?" with
  five unchecked star buttons ("1 star" to "5 stars") in a radio group.
- `docs/mocks/pages/experience-detail/rated.html` — rated: "Thanks! Your rating", the stars up to
  the chosen one checked, the count raised from 11 to 12, the average from 4.7 to 4.8, and "Add
  a comment".
- `docs/mocks/notifications/toast/danger.html` — the failure toast: "Your rating didn't save",
  "Your stars are back to how they were." and "Try again".

### API

- `PUT /api/popkins/{popkinId}/experiences/{experienceId}/my-rating` with `{ "stars": 1..5 }` →
  `200` with `RatingResultDto` (the caller's stars and the new group score). The verb is `PUT`
  because the call sets the caller's single rating and repeating it has the same effect.
  Refusals:
  - `400` `stars_out_of_range`, naming the field `stars`, when `stars` is missing, not a whole
    number or outside one to five (L2-039 AC6, L2-052 AC1);
  - `401` without a session; the anti-forgery or same-site proof of L2-050 AC2 applies;
  - `404` `popkin_not_found` for a non-member (L2-039 AC6, L2-051 AC1);
  - `404` `experience_not_found` for an experience not in the Popkin;
  - `409` `experience_not_rateable` for a "Want to do" experience;
  - `409` `popkin_wrapped_up` for a wrapped-up Popkin (L2-045 AC2);
  - `429` `rate_limited` past the limit.
- The endpoint is under the `messages` policy
  ([Abuse limits](../../security/abuse-limits/README.md)): 60 a minute per person, counted with
  the messages they send and the comments they post. L2-053 names no limit for ratings; this
  one stops a script without touching a member who changes their mind.

### Frontend (`frontend/projects/`)

- **`ExperienceStore.rate(stars)`** (`api/src/lib/api/experiences/experience-store.ts`) — the
  logic is in the store, not the page:
  1. it does nothing where `canRate` is false;
  2. it cancels a rating still on its way, so the last choice wins;
  3. it shows the chosen stars at once (L2-039 AC2);
  4. on success it takes the score and the stars from the answer, the panel's heading becomes
     "Thanks! Your rating" and the panel offers "Add a comment", or "Edit your comment" when
     the member has one. When they have one, the store reads the experience again, so their
     comment under "What people said" carries the new stars;
  5. on any failure it puts the stars back as they were and emits the stars that were chosen on
     `rateFailed$` (L2-039 AC5). The score was never changed, so it needs no putting back.
- **`ExperienceDetailPage`** — shows `pk-rating-panel` when the store's view has a panel, passes
  `(rated)` to `store.rate`, and answers `rateFailed$` with the danger toast "Your rating didn't
  save", "Your stars are back to how they were." and the action "Try again", which rates with
  the same stars again.
- **`pk-rating-panel`** — the tinted card with its heading and the star buttons (`star-btns`): a
  `radiogroup` labelled by the heading; five buttons with `role="radio"`, `aria-checked`, the
  names "1 star" to "5 stars" (`starName`) and a target of at least 44 px (L2-039 AC1). It uses
  roving `tabindex`: only the checked star, or the first when none is checked, is in the tab
  order. The arrow keys move and check the next or previous star, as a radio group does
  (L2-039 AC4). It emits `rated` and holds no data access.
- **`ExperiencesApi.rate(popkinId, experienceId, stars)`** — answers `RatingResultView`.
- **`Toaster`** (`popkin/src/app/toasts/`) — a toast gained an action: `show(variant, heading,
  text, action)` takes a label and what choosing it does, and `act(toast)` dismisses the toast
  and runs it. `pk-toast` draws the action as a button. A failure toast stays until dismissed
  (L2-056 AC7).

### Backend (`backend/src/`)

- **`ExperiencesController.Rate`** — reads `stars` as JSON, passes a whole number or nothing to
  `RateExperienceCommand`, and sends it. It is under `RateLimitPolicyNames.Messages`.
- **`RateExperienceCommandHandler`** — there is no validator class and no validation library:
  the handler checks and throws `ProblemException`, as every command does
  ([Send a message to everyone](../../chat/send-message-to-everyone/README.md)).
  1. calls `IMembershipGuard.RequireActiveMemberAsync(popkinId)`, which answers `404` for a
     non-member and `409` `popkin_wrapped_up` for a wrapped-up Popkin;
  2. refuses stars outside one to five with `400` `stars_out_of_range`;
  3. loads the `Experience` within the Popkin and refuses a "Want to do" one with `409`
     `experience_not_rateable`;
  4. calls `Experience.Rate(membershipId, stars, now)` when the member has no rating, otherwise
     `ExperienceRating.ChangeStars(stars, now)`, so the count does not change (L2-039 AC3);
  5. saves and returns the stars with the new score, as in
     [View an experience](../view-experience/README.md).
  It reads the time from `TimeProvider`.
- **`ExperienceRating`** — primary key `(ExperienceId, MembershipId)`, which keeps one rating per
  member and experience even when two requests race. A first rating that loses the race on the
  key is applied once more as a change to the rating that won. `ExperienceRatingConfiguration`
  adds the check constraint `[Stars] BETWEEN 1 AND 5`.

### Tests

- API integration tests on InMemory: `RateExperienceTests`, `RefusedExperienceTests` and
  `ExperienceRateLimitTests`, in `Popkin.Api.Tests/Experiences/`. The limit advances
  `FakeTimeProvider`.
- Unit tests of `ExperienceStore`: the stars shown at once, the later choice that wins, the
  stars put back.
- Playwright: "Rating an experience" in `e2e/tests/experience-detail.spec.ts`.

### Built in journey 8

Everything above. Decided in the build:

- The limit: the `messages` policy, shared with messages and comments.
- The logic is in `ExperienceStore`; the page only shows the toast.
- A toast has an action, which the success toast of sharing uses too.
- No validation library.

Gaps found, each in [the register](../../README.md#known-gaps):

- The score on other members' screens does not change until they open the page again; nothing
  is sent over the hub, and L2-039 asks for nothing (gap 38).
- An experience edited to "Want to do" keeps its ratings, hidden: it has no score and no
  panel, and they show again if it is edited back (gap 37).

The diagrams below were not redrawn (gap 44). They show a `RateExperienceCommandValidator` and
the page holding the rating, where the handler checks and `ExperienceStore` holds it.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-039` | `L1-010` | Rate an experience: Each member gives one rating from one to five stars. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

## Diagrams

### System context

A member gives an experience one rating from one to five stars in Popkin. No external system
takes part.

![C4 system context for rating an experience](diagrams/c4-context.png)

### Containers

The web app saves the rating through the Popkin API, which inserts or updates one
`ExperienceRating` row in the Popkin database.

![C4 container view for rating an experience](diagrams/c4-container.png)

### Components

The `pk-rating` input reports a chosen star to `ExperienceDetailPage`, which saves it and shows a
toast on failure. In the API, the validator checks the range and the handler applies the rating
to the experience and recomputes the score.

![C4 component view for rating an experience](diagrams/c4-component.png)

### Class structure

`Experience` creates the first `ExperienceRating` of a member; later changes go through
`ExperienceRating.ChangeStars`. The handler returns the caller's stars and the new score.

![Class diagram for rating an experience](diagrams/class-structure.png)

### Behaviour — rate an experience

The page applies the star at once. The API refuses an out-of-range value with `400`, a
non-member with `404`, a wrapped-up Popkin or a "Want to do" experience with `409`. On any
failure the page restores the previous stars and shows the danger toast (L2-039 AC5).

![Sequence diagram for rating an experience](diagrams/sequence-rate-experience.png)

### Behaviour — change a rating with the keyboard

The arrow keys move the checked star by one. Each change cancels the request before it, and the
handler updates the existing rating, so the count stays the same (L2-039 AC3, AC4).

![Sequence diagram for changing a rating with the keyboard](diagrams/sequence-change-rating-with-keyboard.png)
