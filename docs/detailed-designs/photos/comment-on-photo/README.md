# Comment on a photo

## Overview

Popkin is a free platform for pop-up communities. Members of a Popkin share photos in an album
and open each one in the [photo view](../view-photo/README.md). This feature lets members talk
about a photo under it. "Comment", or the comment count on the photo view, opens a dialog. The
dialog lists the photo's comments oldest first and has a field to add one. A member may delete
their own comment after confirming.

- **comment** — short text a member writes about one photo, stored as a `PhotoComment`
- **comment count** — number of comments on a photo, shown on the photo view as "{n} comments"
- **photo comments dialog** — CDK dialog that lists and adds comments, a bottom sheet under
  640 px (L2-058 AC4)

The photo stays visible but inert behind the dialog. When the dialog adds or deletes a comment,
it hands the new count back to the photo view, which updates "{n} comments" (L2-035 AC2).

## Description

### Screens and states

- `docs/mocks/dialogs/photo-comments/default.html` — "3 comments", the comments of Walt
  ("Sat 7:40"), Ellie and Dev with avatar, first name, time and text, the field "Add a comment"
  (`maxlength` 500) and "Post comment".
- `docs/mocks/dialogs/photo-comments/busy.html` — the field holds "Up at 6 again tomorrow?" and
  "Post comment" is disabled with `aria-busy="true"` (L2-056 AC3).
- `docs/mocks/dialogs/photo-comments/empty.html` — title "Comments", "No comments yet" and "Be the
  first to say something about this one." (L2-035 AC4).
- `docs/mocks/pages/photo-view/default.html` — "Comment" and "3 comments", the entry points.

The mocks show no "Delete" on a comment, no confirmation for it, and no failure to load, post or
delete. Their layout and copy are `<TO SUPPLY>`; L2-035 AC5 needs the delete action and its
confirmation.

### API

- `GET /api/popkins/{popkinId}/photos/{photoId}/comments` — `200 OK` with comments oldest first
  (`PhotoCommentDto`: id, author first name and avatar, `AddedAt`, `Text`, `Mine`).
- `POST /api/popkins/{popkinId}/photos/{photoId}/comments` with `{ text }` — `201 Created` with
  the comment. Errors: `400 comment_empty`, `400 comment_too_long` (L2-052 AC1),
  `409 popkin_wrapped_up` (L2-045 AC2).
- `DELETE /api/popkins/{popkinId}/photos/{photoId}/comments/{commentId}` — `204 No Content`.
  Errors: `404 comment_not_found`, `403 comment_not_yours`.
- All three: `404 popkin_not_found` for a non-member (L2-051 AC1), `404 photo_not_found` for a
  photo outside the Popkin.

### Frontend

- **`PhotoCommentsDialog`** — introduced, `dialogs/photo-comments/photo-comments.dialog.ts`,
  opened by `PhotoViewPage` with the CDK `Dialog`. It composes these components:
  - `pk-dialog` for the frame, with the title "{n} comments", or "Comments" when there are none
  - a list of comments using `pk-avatar` (block `comment`)
  - `pk-empty-state`
  - `pk-composer` for the field, with `maxlength` 500 and a count near the limit (L2-035 AC3)

  "Post comment" is disabled while empty or posting. Text is rendered as text, never as HTML
  (L2-052 AC2). Focus moves into the dialog, stays there, and returns to the opener on close
  (L2-057 AC2). On close the dialog returns the current count.
- **`PhotosApi`** — gains `getComments`, `addComment` and `deleteComment`; view model
  `PhotoCommentView` with `mine` to offer "Delete".
- **`PhotoViewPage`** — gains `openComments()` and applies the returned count.

### Backend

- **`PhotosController`** — gains the three comment actions.
- **`GetPhotoCommentsQuery` / `GetPhotoCommentsQueryHandler`** — introduced. It checks membership
  through `IMembershipGuard` and reads the photo's comments ordered by `AddedAt`.
- **`AddPhotoCommentCommand` / `AddPhotoCommentCommandValidator` /
  `AddPhotoCommentCommandHandler`** — introduced. The validator requires 1 to 500 characters after
  trimming. The handler refuses a wrapped-up Popkin, inserts a `PhotoComment` with `AddedAt` from
  `TimeProvider`, and saves.
- **`DeletePhotoCommentCommand` / `DeletePhotoCommentCommandHandler`** — introduced. It deletes the
  comment only when `AuthorMembershipId` is the caller's membership. Owned data stays scoped to
  its owner.
- **Domain** — `PhotoComment` (`Id`, `PhotoId`, `AuthorMembershipId`, `Text`, `AddedAt`).
  `IAppDbContext` gains `DbSet<PhotoComment>`; `PhotoCommentConfiguration` maps it with cascade
  delete from `Photo` (L2-036 AC3) and an index on `(PhotoId, AddedAt)`.
- **Logging** — comment text is never logged (L2-054 AC3).

### Open questions

- Delete action, confirmation and failure states for comments: no mock, `<TO SUPPLY>`.
- Whether the Host may delete any comment, as the Host may delete any photo (L2-036 AC2):
  `<TO SUPPLY>`. The design allows only the author.
- Whether a deleted comment is allowed in a wrapped-up Popkin: `<TO SUPPLY>`.
- Whether comments arrive live for others with the dialog open: `<TO SUPPLY>`. L2-035 does not
  ask for it.
- Rate limit on comments: `<TO SUPPLY>`. L2-053 names none.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-035` | `L1-009` | Comment on a photo: Members talk about a photo under it. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |
| `L2-057` | `L1-014` | Accessible to WCAG 2.2 AA: Everyone can use every screen. |

## Diagrams

### System context

A member reads and writes comments on a photo of a Popkin they belong to.

![C4 system context for commenting on a photo](diagrams/c4-context.png)

### Containers

The web app reads, adds and deletes comments through the Popkin API, which keeps them in the
Popkin database.

![C4 container view for commenting on a photo](diagrams/c4-container.png)

### Components

`PhotoCommentsDialog` composes `pk-dialog`, `pk-composer` and `pk-empty-state` and calls
`PhotosApi`. One query handler and two command handlers serve the three endpoints.

![C4 component view for commenting on a photo](diagrams/c4-component.png)

### Class structure

A `Photo` owns its `PhotoComment` rows. The dialog holds `PhotoCommentView` items and hands the
count back to `PhotoViewPage`.

![Class diagram for commenting on a photo](diagrams/class-structure.png)

### Behaviour — read comments and add one

The dialog loads the comments, or shows the empty invitation. Posting disables the button while
in flight, and on success appends the comment and raises the count (L2-035 AC1 to AC4).

![Sequence diagram for reading and adding comments](diagrams/sequence-open-and-add.png)

### Behaviour — delete own comment

"Delete" is offered only on the member's own comment and asks for confirmation. The server
refuses another member's comment with `403 comment_not_yours` (L2-035 AC5).

![Sequence diagram for deleting a comment](diagrams/sequence-delete-comment.png)
