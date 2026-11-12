# Share an experience

## Overview

Popkin is a free platform for pop-up communities. Members of a *Popkin*, a private space for one
group, collect *experiences*: things the group did, restaurants, and things the group wants to
do. This feature is how an experience gets into a Popkin. Any member of an active Popkin shares
one from Experiences. The sharer may later edit or delete it, and the Host may delete any
experience.

- **share** — act of adding an experience to a Popkin, with a title, a kind and, optionally, a
  picture, a "when" and a place
- **kind** — one of "Something we did", "Restaurant" or "Want to do"
  (`ExperienceKind` `Did`, `Restaurant`, `WantToDo`)
- **when** — free text that says when the experience happened, such as "Sat night"
- **sharer** — member who shared an experience
- **Host** — member who started the Popkin

Once shared, the experience is first in [List experiences](../list-experiences/README.md) and has
its own page ([View an experience](../view-experience/README.md)). A "Something we did" or
"Restaurant" experience can be rated; a "Want to do" experience collects keen members instead
([Say you are keen](../say-keen/README.md)). A wrapped-up Popkin accepts no new experience
(L2-045).

## Description

### Screens and states

- `docs/mocks/dialogs/share-experience/default.html` — "Share an experience": "Title", "Kind" (a
  radio group of three chips), "When (optional)", "Place (optional)" with the placeholder "Where
  it was", "Add a picture (optional)" and "Share it". Under 640 px the dialog is a bottom sheet.
- `docs/mocks/dialogs/share-experience/invalid.html` — empty title: summary "One thing to fix"
  with the link "Title: give it a name.", the field `aria-invalid` and "Give it a name." under
  it.
- `docs/mocks/dialogs/share-experience/busy.html` — fields read-only, "Sharing…" disabled with
  `aria-busy`.
- `docs/mocks/dialogs/share-experience/failed.html` — alert "We couldn't share that. Everything
  you entered is still here."
- `docs/mocks/notifications/toast/success.html` — "Experience shared", "Bonfire songs on the
  beach is first in the list." with "Undo". What "Undo" does is `<TO SUPPLY>`; the design
  assumes it deletes the new experience through the delete endpoint.
- Edit, delete, a delete confirmation and the actions menu that offers them (L2-040 AC6) have no
  mock: `<TO SUPPLY>`. The design reuses `ShareExperienceDialog` in an edit mode until a mock
  decides otherwise.
- The messages for a place over 80 characters and a refused picture have no mock; their copy is
  `<TO SUPPLY>`.

### API

- `POST /api/popkins/{popkinId}/experiences` (`multipart/form-data`: `title`, `kind`, `when?`,
  `place?`, `picture?`) → `201 Created` with `ExperienceCardDto` and a `Location` header.
- `PATCH /api/popkins/{popkinId}/experiences/{experienceId}` (same fields, plus
  `removePicture`) → `200` with `ExperienceCardDto`. Sharer only.
- `DELETE /api/popkins/{popkinId}/experiences/{experienceId}` → `204`. Sharer or Host.
- Refusals for all three: `400` with `code` `title_required`, `title_too_long`,
  `place_too_long`, `invalid_kind`, `picture_type_not_allowed` or `picture_too_large`, naming the
  field (L2-040 AC2, AC3, L2-052 AC1); `401` without a session; `403` `not_experience_sharer`
  for an edit by anyone but the sharer or a delete by anyone but the sharer or the Host; `404`
  `popkin_not_found` (L2-051) or `experience_not_found`; `409` `popkin_wrapped_up` (L2-045 AC2).
- The limit on "when" is `<TO SUPPLY>`; the specs give none and the mock sets no `maxlength`. A
  rate limit for sharing is `<TO SUPPLY>`.

### Frontend (`frontend/projects/`)

- **`ShareExperienceDialog`** — `popkin/src/app/dialogs/share-experience/share-experience.dialog.ts`
  with its `.html`, opened with CDK `Dialog` by `ExperiencesPage` ("Share one" on the floating
  button and in the empty states). It holds a typed reactive form:
  - `title` — required, at most 80 characters (`maxlength="80"`);
  - `kind` — "Something we did" preselected;
  - `when` — optional;
  - `place` — at most 80 characters;
  - `picture` — one file, checked against the limits of L2-031 (JPEG, PNG, WebP or HEIC, at most
    10 MB) before upload.
  On "Share it" with an invalid form it sends nothing, marks each invalid field, shows the form
  summary and moves focus to it. While the request runs, the fields are read-only and the
  button reads "Sharing…" and is disabled, so the request cannot be sent twice (L2-056 AC3). A
  `400` maps each `code` onto its field. Any other failure shows the danger alert and keeps
  every value. On success the dialog closes with the new `ExperienceCardView`.
- **`ExperiencesPage`** — inserts the returned card first (L2-040 AC4), switching the filter to
  "All" when the new kind is outside the current filter, and asks `Toaster` for the success toast
  (shown for 8 seconds, L2-056 AC7).
- **`ExperiencesApi.share`, `.edit`, `.remove`** — build the multipart body and map the answer.
- **Components**: `pk-dialog` (bottom sheet under 640 px, Escape closes), `pk-text-field` for
  Title, When and Place, `pk-chip` in its radio variant for Kind, `pk-form-summary`, `pk-alert`
  (danger), `pk-button` (Popkin, block) and `pk-toast`. The "Add a picture" control is drawn with
  a `date-btn` block that has no design-system page; its component name and the preview of a
  chosen picture are `<TO SUPPLY>`.

### Backend (`backend/src/`)

- **`ExperiencesController.Share`, `.Edit`, `.Delete`** — bind the form, wrap the file in
  `UploadedPicture`, and send `ShareExperienceCommand`, `EditExperienceCommand` or
  `DeleteExperienceCommand`. The request size limit matches 10 MB plus the text fields.
- **`ShareExperienceCommandValidator`** — `Title` trimmed, 1 to 80 characters; `Kind` one of the
  three values; `Place` at most 80 characters; `Picture` at most 10 MB. The validation library
  is `<TO SUPPLY>`. `EditExperienceCommand` uses the same rules.
- **`ShareExperienceCommandHandler`** —
  1. calls `IMembershipGuard.RequireMembershipAsync(popkinId)`;
  2. loads `PopkinSpace` and calls `EnsureActive()` (`409` `popkin_wrapped_up`);
  3. when a picture is given, calls `IPhotoStore.SaveAsync`, which checks the content bytes
     against the allowed image types whatever the file name says (L2-052 AC3), removes location
     and device data (as L2-031 AC6 does for photos), writes the file and a thumbnail, and adds
     a `Photo` row;
  4. creates the experience with `Experience.Share(...)`, `SharedAt` from `TimeProvider`;
  5. saves in one unit of work and returns the `ExperienceCardDto`.
  When the save fails after the file is written, the handler deletes the file. Whether the
  picture also appears in the Popkin's album (Photos) is `<TO SUPPLY>`.
- **`EditExperienceCommandHandler`** — allows only the sharer (`Experience.CanBeEditedBy`);
  replaces or removes the picture. Whether changing the kind of an experience that has ratings
  is allowed is `<TO SUPPLY>`.
- **`DeleteExperienceCommandHandler`** — allows the sharer or a member with `MemberRole.Host`
  (`Experience.CanBeDeletedBy`); removes the experience with its ratings, comments and keen
  records, then the picture file.
- Titles, places and "when" are stored as typed and rendered by Angular interpolation, so HTML
  or script shows as text (L2-052 AC2).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-040` | `L1-010` | Share an experience: Any member shares an experience. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |

## Diagrams

### System context

A member shares experiences in Popkin and the Host may delete any of them. Pictures go to the
photo store.

![C4 system context for sharing an experience](diagrams/c4-context.png)

### Containers

The web app sends the experience as `multipart/form-data` to the Popkin API, which writes the
cleaned picture to the photo store and the experience to the Popkin database.

![C4 container view for sharing an experience](diagrams/c4-container.png)

### Components

`ShareExperienceDialog` calls `HttpExperiencesApi`; `ExperiencesPage` puts the result first and
shows the toast. In the API, the validator checks each field, and the handlers create, edit or
delete the experience.

![C4 component view for sharing an experience](diagrams/c4-component.png)

### Class structure

`Experience.Share` creates the experience for a member of a `PopkinSpace`, optionally with a
`Photo`. `CanBeEditedBy` and `CanBeDeletedBy` hold the sharer and Host rules.

![Class diagram for sharing an experience](diagrams/class-structure.png)

### Behaviour — share an experience

The dialog refuses an invalid form without sending it. The API repeats every check, refuses a
non-member with `404` and a wrapped-up Popkin with `409`. On success the card is first and a
toast confirms it; on failure the dialog keeps everything entered.

![Sequence diagram for sharing an experience](diagrams/sequence-share-experience.png)

### Behaviour — edit or delete an experience

The sharer edits through the same dialog; the sharer or the Host deletes. Anyone else receives
`403` `not_experience_sharer` (L2-040 AC6).

![Sequence diagram for editing or deleting an experience](diagrams/sequence-edit-or-delete-experience.png)
