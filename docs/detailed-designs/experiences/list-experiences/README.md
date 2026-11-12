# List experiences

## Overview

Popkin is a free platform for pop-up communities. A *Popkin* is a private space for one group,
with a name, an emoji, a colour, members and a length. Inside a Popkin, members chat, call, share
photos and share experiences.

- **experience** — something the group did, a restaurant, or something the group wants to do,
  which members rate and comment on
- **kind** — category of an experience, shown as "Something we did", "Restaurant" or "Want to do"
- **score** — average of the members' star ratings of an experience, to one decimal, with the
  number of ratings
- **keen** — interest a member shows in a "Want to do" experience (see
  [Say you are keen](../say-keen/README.md))

This feature is the Experiences tab of a Popkin. It lists every experience of the Popkin as a
card, the newest first, and lets a member narrow the list to what the group did or to what it
wants to do. A card for something the group did shows its score; a card for something the group
wants to do shows how many members are keen. The list is the entry point to the other features of
the Experiences subsystem: choosing a card opens [View an experience](../view-experience/README.md)
and "Share one" opens [Share an experience](../share-experience/README.md).

The list is private to the Popkin's members (L2-051). A person who is not a member receives the
same answer as for a Popkin that does not exist.

## Description

The slice runs from the Experiences page to the database. Everything below is introduced by this
design; the existing code holds only the cookie authentication, the fallback authorisation
policy, ProblemDetails, `IAppDbContext` and `AppDbContext`.

### Screens and states

- `docs/mocks/pages/experiences/default.html` — filter "All": four cards, three with a score and
  one with "7 keen".
- `docs/mocks/pages/experiences/did.html` — filter "We did": things done and restaurants.
- `docs/mocks/pages/experiences/want.html` — filter "Want to do".
- `docs/mocks/pages/experiences/no-results.html` — "Want to do" with nothing in it: "Nothing on
  the wish list", "Share one" and "Show all". The copy for an empty "We did" filter has no mock:
  `<TO SUPPLY>`.
- `docs/mocks/pages/experiences/empty.html` — a Popkin with no experiences: "Nothing shared yet"
  and "Share one".
- `docs/mocks/pages/experiences/loading.html` — card skeletons and the hidden status "Loading
  experiences…".
- `docs/mocks/pages/experiences/error.html` — "We couldn't load the experiences" with "Try
  again"; the tabs stay.

### API

- `GET /api/popkins/{popkinId}/experiences?filter=all|did|want` → `200` with a list of
  `ExperienceCardDto`. Refusals: `401` without a session (L2-050), `404` `popkin_not_found` for a
  non-member or an unknown Popkin (L2-051), `400` `invalid_filter` for any other filter value
  (L2-052).

### Frontend (`frontend/projects/`)

- **`ExperiencesPage`** — `popkin/src/app/pages/experiences/experiences.page.ts` with
  `experiences.page.html`, selector `pk-experiences-page`, OnPush. Route `/p/:popkinId/experiences`
  with route data `{ shell: 'app', page: 'experiences' }`, behind `signedInGuard` and
  `memberGuard`. The page holds the current filter in a signal read from the route query
  `filter` (`all` when absent), so a filtered list survives a reload. It requests the list
  through `EXPERIENCES_API`, shows skeletons when the answer takes longer than 300 ms, and
  renders one of four outcomes: cards, the empty state, the no-results state or the error
  state. "Share one" opens `ShareExperienceDialog` (the floating button and the empty states).
  "Show all" sets the filter back to `all`.
- **`ExperiencesApi`**, **`EXPERIENCES_API`**, **`HttpExperiencesApi`** — `api/src/lib/api/`.
  Contract, injection token and HTTP implementation. `list(popkinId, filter)` maps each
  `ExperienceCardDto` to an `ExperienceCardView`. Later slices add methods to the same contract.
- **`ExperienceCardView`** — `api/src/lib/models/`. The card's view model: kind label, title,
  picture address or the Popkin's emoji and colour, the byline ("Mara · Sat morning"), the
  average formatted to one decimal with its count ("4.8 (11)"), or the keen count ("7 keen").
- **`ExperienceFilterKey`** — `'all' | 'did' | 'want'`, with the chip labels "All", "We did" and
  "Want to do".
- **Components** (`components` library): `pk-chip` for the filter chips (`role="group"`,
  `aria-label="Filter"`, `aria-pressed` on the chosen one, L2-037 AC4); `pk-card` in its
  experience variant (`exp-card`) for each card, one whole-card link with a picture, a kind tag,
  a title and a foot; `pk-avatar` in the foot; `pk-rating` in its inline variant for the score;
  `pk-empty-state` for the empty, no-results and error states; `pk-skeleton` for loading;
  `pk-button` in its floating variant (`fab`) for "Share one"; `pk-popkin-nav` for the tabs. The
  mocks draw the page heading with a `tab-header` block that has no design-system page; its
  component name is `<TO SUPPLY>`.

### Backend (`backend/src/`)

- **`ExperiencesController`** (`Popkin.Api`) — route `/api/popkins/{popkinId}/experiences`.
  The `List` action binds `filter`, refuses an unknown value with `400` `invalid_filter`, and
  sends `GetExperiencesQuery`. The controller holds no business rule.
- **`GetExperiencesQuery`** and **`GetExperiencesQueryHandler`** (`Popkin.Application`) — the
  handler calls `IMembershipGuard.RequireMemberAsync(popkinId)`, which throws not-found for a
  non-member so the API answers `404` `popkin_not_found`. It reads the Popkin's experiences in
  one query through `IAppDbContext`, newest `SharedAt` first. The filter `WeDid` keeps kinds
  `Did` and `Restaurant`; `WantToDo` keeps kind `WantToDo` (L2-037 AC4). For each experience
  the query projects the star values (for `Did` and `Restaurant`) and the keen count (for
  `WantToDo`) without loading the rating rows into memory.
- **`ExperienceScore`** (`Popkin.Domain`) — value object computed from a set of star values:
  `Average` rounded to one decimal (`MidpointRounding.AwayFromZero`), `null` when there are no
  ratings, and `Count`. [View an experience](../view-experience/README.md) extends it with the
  count per star value.
- **`ExperienceCardDto`** — the card: id, kind, title, picture address, the Popkin's emoji and
  colour (shown in the picture's place when there is no picture, L2-040 AC5), the sharer's first
  name and avatar, the free-text "when", `SharedAt`, average, rating count and keen count. The
  sharer's first name is the part of `Membership.DisplayName` before its first space.
- **`IPhotoStore`** / **`ObjectStoragePhotoStore`** — returns an expiring, unguessable address
  for the picture's thumbnail (L2-051 AC2, L2-055 AC4). The web app loads thumbnails lazily.
- **Entities** — `Experience`, `ExperienceRating` and `ExperienceKeen` as in the shared model.
  This subsystem adds two optional fields to `Experience`: `When` (free text such as "Sat
  morning"; length limit `<TO SUPPLY>`, the specs give none) and `Place` (at most 80 characters,
  L2-040 AC3). `IAppDbContext` gains `DbSet<Experience>`, `DbSet<ExperienceRating>` and
  `DbSet<ExperienceKeen>`; `ExperienceConfiguration` indexes `(PopkinId, SharedAt)`.

### Open points

- The byline of a card without a "when": the mock shows "Ellie · Idea" for a "Want to do" card;
  the text for other kinds is `<TO SUPPLY>`.
- Whether the list updates live when another member shares or rates an experience
  (`IPopkinNotifier`) is `<TO SUPPLY>`; L2-037 does not require it.
- Paging for a Popkin with a long list is `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-037` | `L1-010` | List experiences: Experiences collects what the group did and what it wants to do. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

## Diagrams

### System context

A member browses the Popkin's experiences in Popkin. Pictures come from the photo store through
expiring addresses.

![C4 system context for listing experiences](diagrams/c4-context.png)

### Containers

The web app requests the list from the Popkin API, which reads experiences, ratings and keen
members from the Popkin database and signs picture addresses for the photo store.

![C4 container view for listing experiences](diagrams/c4-container.png)

### Components

`ExperiencesPage` composes `pk-*` components and calls `HttpExperiencesApi`.
`ExperiencesController` sends `GetExperiencesQuery`; its handler checks membership, queries the
database and builds an `ExperienceScore` per card.

![C4 component view for listing experiences](diagrams/c4-component.png)

### Class structure

An `Experience` owns its ratings and keen records. The handler projects each into an
`ExperienceCardDto`, and the web app maps that to an `ExperienceCardView`.

![Class diagram for listing experiences](diagrams/class-structure.png)

### Behaviour — open Experiences

The handler refuses a non-member with `404` `popkin_not_found` (L2-051 AC1), otherwise returns
cards newest first with a score or a keen count. The page shows skeletons after 300 ms, the empty
state for a Popkin with no experiences, and the error state with "Try again" when the request
fails.

![Sequence diagram for opening Experiences](diagrams/sequence-open-experiences.png)

### Behaviour — filter experiences

Choosing a chip marks it pressed and requests that group; "We did" includes restaurants
(L2-037 AC4). An empty group shows its message with "Share one" (L2-037 AC5).

![Sequence diagram for filtering experiences](diagrams/sequence-filter-experiences.png)
