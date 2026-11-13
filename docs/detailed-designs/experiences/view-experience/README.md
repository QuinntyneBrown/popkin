# View an experience

## Overview

Popkin is a free platform for pop-up communities. Members of a *Popkin*, a private space for one
group, share *experiences*: things the group did, restaurants, and things the group wants to do.
[List experiences](../list-experiences/README.md) shows them as cards. This feature is the page
a card opens.

- **experience detail** — page of one experience: its picture, kind, when, title, sharer and
  place, the group score and what members said about it
- **group score** — summary of every member's rating of one experience: the average to one
  decimal, the number of ratings and the count for each star value from five to one
- **score card** — card that presents the group score with filled stars and one bar per star
  value
- **comment** — words a member adds to their own rating (see
  [Comment on an experience](../comment-on-experience/README.md))

The page is shared by three neighbouring features. The panel under the score card belongs to
[Rate an experience](../rate-experience/README.md) for kinds "Something we did" and
"Restaurant", and to [Say you are keen](../say-keen/README.md) for "Want to do". This design
covers what the page shows and how the group score is computed. Like every read in a Popkin, the
page is private to its members (L2-051).

## Description

### Screens and states

- `docs/mocks/pages/experience-detail/default.html` — "Sunrise canoe to Heron Point": picture
  with a "Back" button, "Something we did · Sat morning", title, "Shared by Mara", "Heron Point,
  Lake Ossia", score card 4.7 from 11 ratings, the rating panel, and three comments under "What
  people said".
- `docs/mocks/pages/experience-detail/own.html` — the same page for its sharer: an "Experience
  actions" button over the picture ([Share an experience](../share-experience/README.md)).
- `docs/mocks/pages/experience-detail/want.html` — a "Want to do" experience: no score card; the
  keen panel takes its place (journey 20).
- `docs/mocks/pages/experience-detail/loading.html` — picture and text skeletons with the hidden
  status "Loading this experience…".
- `docs/mocks/pages/experience-detail/error.html` — "We couldn't load this experience" with "Try
  again" and "Back to Experiences".
- An experience nobody has rated has no mock of its own. Its score card shows five empty stars
  and "Nobody has rated it yet", and "What people said" reads "Nobody has commented yet."

### API

- `GET /api/popkins/{popkinId}/experiences/{experienceId}` → `200` with `ExperienceDetailDto`.
  Refusals: `401` without a session, `404` `popkin_not_found` for a non-member or an unknown
  Popkin (L2-051), `404` `experience_not_found` for an experience that is not in this Popkin.

### Frontend (`frontend/projects/`)

- **`ExperienceDetailPage`** — `popkin/src/app/pages/experience-detail/experience-detail.page.ts`
  with its `.html`, selector `pk-experience-detail-page`, OnPush. Route
  `/p/:popkinId/experiences/:experienceId` with route data
  `{ shell: 'app', page: 'experience-detail' }`, behind `signedInGuard`. It is a container: it
  draws what `ExperienceStore` gives it and opens the dialogs of the neighbouring designs. A
  `404` opens the not-found screen (L2-051 AC1).
- **`ExperienceStore`** — `api/src/lib/api/experiences/experience-store.ts`, one per screen,
  provided by the route. It holds the logic, not the page (ADR 0011). `open(popkinId,
  experienceId)` reads the experience; `state` is `loading`, `ready`, `error` or `not-found`.
  `view` is the page as it is drawn: the kind's label, "Shared by Mara", the score (null for
  "Want to do"), the rating panel (null where `canRate` is false), the comments, and `canEdit`
  and `canDelete`. `refresh()` reads again after an edit and keeps what is shown until the
  answer comes. Rating and commenting are in the neighbouring designs.
- **`ExperiencesApi.get(popkinId, experienceId)`** — answers `ExperienceDetailView`: the card's
  fields, `place`, `score` (`average`, `ratingCount` and five `counts`, five stars first),
  `myRating`, `comments`, `canRate`, `canEdit` and `canDelete`.
- **`experience-text.ts`** — `ratingsText` ("11 ratings", "1 rating"), `starsLabel` ("4.7 out
  of 5") and `scoreBars`: five bars, each with its percent and its text ("5 stars: 9 ratings",
  "4 stars: 1 rating"). The mocks now write the singular too.
- **Components**: `pk-experience-detail` for the page's frame (the picture or the Popkin's
  emoji, "Back" and "Experience actions" over it, the kind and when, the title, the sharer, the
  place, and the loading state); `pk-score-card` with `pk-stars` for the group score;
  `pk-rating-panel` for the member's rating; `pk-comments` and `pk-comment` for "What people
  said"; `pk-top-bar` and `pk-empty-state` for the error.

### Backend (`backend/src/`)

- **`ExperiencesController.Get`** — sends `GetExperienceQuery`.
- **`GetExperienceQuery`** / **`GetExperienceQueryHandler`** — calls
  `IMembershipGuard.RequireMemberAsync`, loads the experience within the Popkin (an id from
  another Popkin answers `404` `experience_not_found`, L2-051 AC3) and its sharer, who may have
  left. It builds:
  - the group score through `ExperienceScores` and `ExperienceScore`; a "Want to do" experience
    has none, so its counts are all 0;
  - the comments: every `ExperienceRating` with a `Comment`, newest `CommentedAt` first, each
    with the author's avatar, first name and stars (L2-038 AC4). A "Want to do" experience
    lists none;
  - the reader's own stars and comment (`MyRating`), and the flags `CanRate`, `CanEdit` and
    `CanDelete`. Each flag is false when the Popkin is wrapped up (L2-045). `CanRate` is also
    false for "Want to do"; `CanEdit` is true for the sharer; `CanDelete` for the sharer and
    the Host.
- **`ExperienceScore`** (`Popkin.Domain`) — value object built from the count per star value.
  - `Count` is the sum of the five counts.
  - `Average` is the sum of stars times count divided by `Count`, rounded to one decimal in
    decimal arithmetic with `MidpointRounding.AwayFromZero`; `null` when `Count` is 0.
  - `CountFor(stars)` returns the count for one value.
  - The database groups the ratings by star value, so the computation reads five numbers, not
    every rating.
- **`ExperienceScoreDto`** — `Average`, `RatingCount` and `Counts`, always five entries, five
  stars first. The API sends counts, not percents.
- **The bars** — the web app draws each bar against the largest of the five counts
  (`scoreBars`): 100, 11, 11, 0 and 0 for counts 9, 1, 1, 0 and 0, as the mock draws them.
  L2-038 AC2 asks for bars "in proportion to its share"; the design follows the mock, and the
  count beside each bar says the share exactly.
- **`ExperienceRating.CommentedAt`** — the time a comment was last written, so "What people
  said" orders by it rather than by `RatedAt`.
- **Picture** — the page shows the display image, at an expiring address from `IPhotoStore`;
  the cards show the thumbnail.
- **Accessible score** — the page states the average as an image label ("4.7 out of 5"), the
  count as text and each value's count as visually hidden text; the bars are hidden from
  assistive technology (L2-038 AC3).

### Tests

- API integration tests on InMemory: `ViewExperienceTests`, in
  `Popkin.Api.Tests/Experiences/`.
- Unit tests of `ExperienceStore` and of `experience-text.ts`, one case per row of the bars and
  the counts.
- Playwright: "An experience" in `e2e/tests/experience-detail.spec.ts`.

### Built in journey 8

Everything above, for "Something we did" and "Restaurant". Decided in the build:

- An unrated score card reads "Nobody has rated it yet".
- The bars scale to the largest count; "1 rating" is singular.
- The picture block (`hero-media`) is part of `pk-experience-detail`, and the comment row is
  `pk-comment` inside `pk-comments`.
- The mocks' averages were corrected to what their counts give: 4.7 for the canoe (9, 1 and 1),
  4.6 and 4.3 on the list.
- The page of a wrapped-up Popkin is the same page without the rating panel and without
  "Experience actions": the flags are false. It has no mock of its own.

Gaps found, each in [the register](../../README.md#known-gaps):

- The page of a "Want to do" experience shows its picture, kind, title, sharer and place and
  nothing else. The keen panel and "We did this" are journey 20 (gap 42), and so are the
  comments `want.html` draws without stars (gap 43).
- The score and the comments do not change when another member rates or comments; they are
  read again when the page opens (gap 38).
- The skeletons show at once, not after 300 ms.

The diagrams below were not redrawn (gap 44). They show `ExperienceScoreView` with
`StarBarView`s, `StarBarDto`, `BarPercent` and `CanMarkDone`, where there are now
`ExperienceStore`, counts in the answer and bars computed in the web app.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-038` | `L1-010` | See an experience and the group's score: An experience has a page of its own. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

## Diagrams

### System context

A member reads one experience, its group score and its comments in Popkin; its picture comes
from the photo store.

![C4 system context for viewing an experience](diagrams/c4-context.png)

### Containers

The web app requests the experience from the Popkin API, which reads it and its ratings from the
Popkin database.

![C4 container view for viewing an experience](diagrams/c4-container.png)

### Components

`ExperienceDetailPage` calls `HttpExperiencesApi`. `GetExperienceQueryHandler` checks membership,
reads the database and builds the group score through `ExperienceScore`.

![C4 component view for viewing an experience](diagrams/c4-component.png)

### Class structure

`ExperienceScore` is computed from the experience's ratings and travels to the web app as an
`ExperienceScoreDto` with five `StarBarDto`s; comments are ratings that carry text.

![Class diagram for viewing an experience](diagrams/class-structure.png)

### Behaviour — open an experience

A non-member receives `404` `popkin_not_found`; an id from another Popkin receives `404`
`experience_not_found`. A member sees the details, the score card or its no-ratings message, and
the comments. A failed request keeps a way back to Experiences.

![Sequence diagram for opening an experience](diagrams/sequence-open-experience.png)

### Behaviour — compute the group score

The database returns one count per star value. `ExperienceScore` derives the count, the average
to one decimal and a bar per value; the page renders the bars for sight and the counts as text
for assistive technology.

![Sequence diagram for computing the group score](diagrams/sequence-compute-group-score.png)
