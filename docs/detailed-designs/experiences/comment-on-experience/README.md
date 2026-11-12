# Comment on an experience

## Overview

Popkin is a free platform for pop-up communities. Members of a *Popkin*, a private space for one
group, rate the experiences the group shares from one to five stars
([Rate an experience](../rate-experience/README.md)). This feature lets a member who has rated
an experience add a few words to that rating, and change them later.

- **comment** — short text a member attaches to their own rating of an experience; at most one
  per member and experience
- **What people said** — list of comments on the experience detail page, the newest first, each
  with the author's avatar, first name and stars

A comment belongs to a rating: it has no stars of its own and no existence without the rating.
The design therefore stores it on the member's `ExperienceRating` row rather than in a separate
table. [View an experience](../view-experience/README.md) lists the comments; this feature adds
and replaces them. A wrapped-up Popkin accepts no new comment (L2-045).

## Description

### Screens and states

- `docs/mocks/pages/experience-detail/rated.html` — after rating, the panel offers "Add a
  comment".
- `docs/mocks/dialogs/add-comment/default.html` — dialog titled with the experience ("Sunrise
  canoe to Heron Point"), the member's stars ("5 out of 5") with "Your rating", the "Your
  comment" field with the hint "Up to 500 characters." and "Post comment".
- `docs/mocks/dialogs/add-comment/invalid.html` — empty comment: the field `aria-invalid` and
  "Write a few words, or close this to keep just your stars."
- `docs/mocks/dialogs/add-comment/busy.html` — field read-only, "Posting…" disabled with
  `aria-busy`.
- "Edit your comment" (L2-041 AC4) has no mock; where the page offers it is `<TO SUPPLY>`. A
  failed-save state of the dialog has no mock; its copy is `<TO SUPPLY>`.

### API

- `PUT /api/popkins/{popkinId}/experiences/{experienceId}/my-rating/comment` with
  `{ "text": "…" }` → `200` with `ExperienceCommentDto`. The same call adds and replaces the
  comment. Refusals:
  - `400` `comment_required` (empty after trimming) or `comment_too_long` (over 500
    characters), naming the field `text` (L2-041 AC2, L2-052 AC1);
  - `401` without a session;
  - `404` `popkin_not_found` (L2-051) or `experience_not_found`;
  - `409` `rating_required` when the caller has not rated the experience;
  - `409` `popkin_wrapped_up` (L2-045 AC2).
- Removing a comment is not in L2-041; whether a member may clear their comment is
  `<TO SUPPLY>`.

### Frontend (`frontend/projects/`)

- **`AddCommentDialog`** — `popkin/src/app/dialogs/add-comment/add-comment.dialog.ts` with its
  `.html`, opened with CDK `Dialog` by `ExperienceDetailPage` from "Add a comment" or "Edit your
  comment". It receives `AddCommentData`: the experience title, the member's stars and the
  existing text, if any (L2-041 AC1, AC4).
  - The `textarea` carries `maxlength="500"`, so the field cannot exceed the limit.
  - "Post comment" with an empty or blank comment sends nothing and shows the invalid state
    (L2-041 AC2).
  - While saving, the field is read-only and the button reads "Posting…" and is disabled.
  - A `400` maps onto the field; other failures keep the text and enable the button again.
  - On success the dialog closes with the saved `ExperienceCommentView`.
- **`ExperienceDetailPage`** — offers "Add a comment" when the member has rated and has no
  comment, and "Edit your comment" when they have one. On close it removes the member's earlier
  entry, if any, and puts the returned comment first under "What people said" (L2-041 AC3).
- **`ExperiencesApi.comment(popkinId, experienceId, text)`**.
- **Components**: `pk-dialog`, `pk-rating` (inline stars with `role="img"`), `pk-textarea` with
  its hint and error, `pk-button` (Popkin, block).

### Backend (`backend/src/`)

- **`ExperiencesController.Comment`** — sends `CommentOnExperienceCommand`.
- **`CommentOnExperienceCommandValidator`** — `Text` not empty after trimming, at most 500
  characters. The validation library is `<TO SUPPLY>`.
- **`CommentOnExperienceCommandHandler`** —
  1. calls `IMembershipGuard.RequireMembershipAsync(popkinId)`;
  2. loads `PopkinSpace`, `Experience` and the caller's `ExperienceRating`;
  3. refuses a wrapped-up Popkin (`409` `popkin_wrapped_up`) and a caller without a rating
     (`409` `rating_required`);
  4. calls `ExperienceRating.SetComment(text, now)`, which replaces any earlier text and sets
     `CommentedAt` from `TimeProvider`;
  5. saves and returns the comment with the author's first name, avatar and stars.
- **`ExperienceRating.Comment`** — `nvarchar(500)`; `CommentedAt` orders "What people said". The
  text is stored as typed and rendered by Angular interpolation, so HTML or script shows as
  text (L2-052 AC2).

### Open points

- `docs/mocks/pages/experience-detail/want.html` shows comments without stars on a "Want to do"
  experience, which has no rating. How a member comments there, and whether such comments live
  on `ExperienceRating`, is `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-041` | `L1-010` | Comment on an experience: A member adds a few words to their rating. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |

## Diagrams

### System context

A member who has rated an experience adds or edits a comment in Popkin. No external system takes
part.

![C4 system context for commenting on an experience](diagrams/c4-context.png)

### Containers

The web app saves the comment through the Popkin API, which updates the member's rating row in
the Popkin database.

![C4 container view for commenting on an experience](diagrams/c4-container.png)

### Components

`ExperienceDetailPage` opens `AddCommentDialog`, which calls `HttpExperiencesApi`. The validator
checks the text and the handler sets it on the member's `ExperienceRating`.

![C4 component view for commenting on an experience](diagrams/c4-component.png)

### Class structure

The comment is a field of `ExperienceRating`, set through `SetComment`. The dialog receives the
member's stars and any existing text in `AddCommentData`.

![Class diagram for commenting on an experience](diagrams/class-structure.png)

### Behaviour — post a comment

An empty comment is refused in the dialog and by the API. A caller without a rating receives
`409` `rating_required`; a wrapped-up Popkin receives `409` `popkin_wrapped_up`. A saved comment
is first under "What people said" with the member's stars (L2-041 AC3).

![Sequence diagram for posting a comment](diagrams/sequence-post-comment.png)

### Behaviour — edit a comment

"Edit your comment" opens the dialog with the current text; saving replaces it and moves it to
the top (L2-041 AC4).

![Sequence diagram for editing a comment](diagrams/sequence-edit-comment.png)
