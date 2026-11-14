# Popkin mocks

Static HTML mocks for every page, dialog and notification in Popkin, in every state, derived from
the Popkin Community Platform designs (the Magic Patterns export). They are the source of truth
for the UI (ADR 0003): change a mock first, then the app.

<!--
Cast and catalog. Reuse these in every mock so the story holds together.

Today: Saturday 12 September 2026, noon (the chat on screen is from that morning).
Popkin: Lakeside Weekend 🏕️, colour Teal, 14 members, link popk.in/lakeside, runs Fri 11 – Sun 13
  Sep, wraps up Sun at 6 pm (1 day 6 hrs left), 48 photos from 11 people, 1,286 messages.
Host and signed-in member: Mara Okafor (Coral avatar, photo), phone (415) 555-0148, mara@hey.com.
Members: Walt Brennan (Leaf, photo), Dev Patel (Sky, photo), Ellie Brennan (Berry, photo),
  Ruth Lindqvist (Teal), Sam Ortega (Amber), Grace Adeyemi (Plum), Joel Kim (Sky, the person
  joining), Priya Nair (Coral), Tomás Reyes (Leaf).
Mara's other Popkins: Thursday Night Group 🕯️ Amber, 9 members, ongoing; Tigers U9 Parents ⚽
  Leaf, 22 members, until Nov 30. Wrapped up: Build Weekend ’26 💻 Sky; Brennan Reunion 🌻 Berry.
Experiences: Sunrise canoe to Heron Point (4.7, 11 ratings, by Mara); La Paloma Taqueria (4.5, 9,
  Sam); Ridge trail loop (4.2, 8, Walt); Beach day next summer? (want to do, 7 keen, Ellie).
Trips and Schedules are shown in another of Mara's Popkins: Cabin Week ’27 🛶, colour Sky, 6
  members (Mara, Walt, Dev, Ellie, Sam, Priya), ongoing. Its trip is Mon 15 – Fri 19 Feb 2027.
  Sprint: "Planning sprint", Aug 30 – Sep 26 2026 (today is day 13 of 27; 14 days left);
  14 stories, 35 points in all, 24 left, 7 behind, finishes Sep 30 at this week's pace.
  Time off is entered by the week from Feb 1 to Mar 8 2027; Dev is tentative for the trip week.
  This week runs Sat 12 – Fri 18 Sep; Wednesday is the evening all six are free, from 7:30 pm.
Admin app: Noor Haddad (Plum, initials) runs Popkin; both switches on since Sep 1 2026.
-->

## How to open them

Open [index.html](index.html) in a browser, straight from disk; nothing needs a server or a
network. Every mock has a bar at the bottom that lists its sibling states and switches the theme.

- `?theme=dark` or `?theme=light` forces a theme; `t` toggles it.
- `?chrome=0` hides the mock bar and the notes, leaving exactly what the product shows.
- Every screen fills the width it is given, as the designs draw it for five form factors: XS (under
  640 px), S (640), M (768), L (1024) and XL (1280 and up).
  - XS and S: one column, with the Popkin's tabs along the bottom. From S, cards, photos and paired
    actions take a second column.
  - M: the tabs become a side rail. Onboarding, joining and wrapping up split in two: the form on one
    side and a picture of what it makes on the other.
  - L: the rail becomes a sidebar with the Popkin's name and time left. Chat shows the thread list
    beside the open thread, the home and an experience use two columns, and a photo gets a side
    panel with its comments.
  - XL: a third pane opens: who is here in a thread, who is on a call.
- Dialogs are shown over the page they open from, which stays visible but inert. Under 640 px they
  are bottom sheets.

## Assets

The mocks are built on the design system, so a change there shows here:

- `../design-system/tokens/tokens.css` and `../design-system/assets/components.css`: the tokens (light, dark and the seven
  Popkin colours) and every component class. The fonts load from `../design-system/assets/fonts/`.
- `assets/tokens.css`: a one-line forwarder to the design system's tokens, for the gallery that `check_mocks.py` generates.
- `assets/images/`: the design's photographs, resized for the mocks.
- `assets/mock.css`, `assets/mock.js`: the mock bar, the notes and the brand sheet's own layout; not product UI.

## Where the mocks differ from the designs

- **Wide layouts the designs do not draw.** Sign in, the code screens and join with a code split like
  sign up, with the same photograph. The account screen and the full-page errors keep one centred
  column. A Popkin's error screens have no sidebar, as they have no tabs on a phone.
- **The timeline's emoji.** The emoji above the How long timeline is `split-aside__icon`, not
  `timeline__icon`: it sits outside the `timeline` block and is an element of the aside.

- **Colour scheme.** On 12 November 2026 the designs moved to the Straight palette: white paper,
  black ink, coral `#EA7671`, sun `#DCC573` and green `#5C8F57`, with black text on every colour
  and a black stage for calls and photos. The mocks follow it through the design system's tokens.
- **Contrast.** Control edges use a darker line (`#8a8a84`, 3.5:1) than the design's hairline
  (`#e4e4e0`), and a focused field's edge is deep coral (`#b4403b`) rather than coral (2.9:1), so
  fields meet WCAG 2.2 AA (L2-057). A Popkin colour drawn as an edge or icon on white is darkened
  30% toward black for 3:1.
- **Popkin colour names.** The designs now label three of the seven colours Green, Sage and Sun;
  the requirements still call them Teal, Leaf and Amber, and so do the mocks until L1 and L2
  change.
- **Dark theme.** The designs define dark colours for the brand sheet only, and the Straight
  palette left them as they were. The mocks apply them
  to every screen and tint each Popkin's colour for dark surfaces.
- **States the designs do not draw.** Loading, empty, error, invalid, busy, offline and read-only
  states, the code screen, sign in, account, the dialogs and the notifications are new, built
  from the designs' components and voice.
- **A wrapped-up Popkin.** Its tabs lose the time left and the unread count, and Home leads to the
  recap. Photos, Experiences and an experience keep everything to read and lose every way to add
  (`wrapped`); the album not kept shows the days left (`going`) and then that the photos were
  removed (`removed`). The recap without a photo draws the emoji alone (`wrapped-up/plain`).
- **Own reactions** are outlined as well as tinted, and the speaking ring is 3 px, so neither is
  carried by colour alone.
- **Message actions.** The designs offer six quick reactions; the mocks offer five, as L2-024 AC1
  asks (❤️ 😂 😍 🔥 👏), and move 🥞 under "More reactions" with eleven others (`reactions/more`).
  Delete on your own message (`reactions/mine`) asks first (`delete-message`). A quote is a
  button, "Go to Ellie’s message", that marks the quoted message (`group-chat/marked`); a quote
  whose message was deleted reads "Message deleted" (`group-chat/deleted-quote`). In a
  wrapped-up Popkin the chips are not buttons. "Message copied." and the failures "We couldn’t
  save your reaction.” and “We couldn’t delete your message.” use the toasts of
  `toast/success` and `toast/danger`.
- **Engaging with a photo.** The designs draw the photo view’s reactions and comments only. The
  mocks add "Photo actions" (⋯) beside Save photo for whoever may delete the photo (`default`;
  a member on someone else’s photo has none, `member`), its menu (`photo-actions`) and "Delete
  this photo?" (`delete-photo`), after which the album says "Photo deleted."
  (`photo-album/photo-deleted`). From 1024 px the side panel has the field "Add a comment" under
  the react bar. Your own comment has "Delete comment" (`own-comment`), which asks first
  (`delete-comment`). A photo deleted while it is open says "This photo was removed" (`removed`);
  a chat message whose photo was deleted reads "Photo removed" (`group-chat/photo-removed`). A
  photo of a direct message takes reactions and comments as an album photo does (`direct`).

## Open questions

These are assumptions in `docs/specs/L2.md` that the designs do not settle. Each mock that
depends on one says so.

1. Sign in, the six-digit code screen and the account screen have no design; they are built from
   the sign-up step.
2. Where "Join with a code" leads: a screen to type the code or link (`join-code`).
3. What the Popkin settings menu (⋯ on the home) holds; the mocks give the Host edit, length,
   invite and wrap up, and a member invite and leave. `host-now` and `member-now` draw the menu as
   journey 9 builds it (Invite people and, for the Host, Wrap up); journeys 16 and 18 add the rest.
4. How a member says they are keen on a "Want to do" experience: settled by journey 20. The
   keen panel holds the "I'm keen" toggle (`experience-detail/want`), pressed it reads "You're
   keen" (`want-keen`), and the sharer and the Host also get "We did this" (`want-own`).
5. Safety, Privacy, Help, Terms and Contact have no pages yet; their links lead to `not-found`.
6. Trips and Schedules (`trip-board`, `burn-down`, `time-off`, `this-week` and their dialogs)
   come from the Trip Board, Burn-down, Time off and This week designs. The designs call the
   tab "Plan"; the requirements and the mocks call it "Trips" (L1-017). The designs say the
   hours come "from everyone's work calendars"; the mocks have each member enter their own
   (`my-hours`), as L2-074 states, and a calendar connection is open. The story dialog
   (`story`) and the empty, loading and error states are new.
7. The admin app (`admin-features`, `admin-sign-in`, `admin-denied`, `turn-off-feature`) has
   no design at all (L1-019, ADR 0016); it is built from the Popkin app's components with an
   "Admin" mark in the top bar.
8. The earlier mocks of a Popkin's screens show four tabs. They now stand for a Popkin where
   Trips and Schedules are off (L2-077 AC1); the new screens show all six tabs.

## Checking and screenshots

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks
```

The first regenerates `index.html` and the coverage below, then checks every file. The second
writes screenshots at 360, 768 and 1280 px in both themes to `docs/mocks/.cache/` (never commit
it).

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | email | invalid | submitting | expired | name | blank | edge | custom | forever | copied | wrapped | not-found | with-photo | active-only | offline | partial | ongoing | last-hour | last-hour-member | failed-send | new-messages | read-only | marked | deleted-quote | photo-preview | photo-refused | photo-removed | call | two | muted | camera-off | mine | no-results | going | removed | photo-deleted | not-reacted | direct | own-comment | member | reaction-failed | save-failed | did | want | own | rated | want-keen | want-own | album-off | host | exporting | plain | success | off | done | confirmed | working | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing (`landing`) | [✅](pages/landing/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-058`, `L2-061` |
| Welcome (`welcome`) | [✅](pages/welcome/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002`, `L2-007`, `L2-015` |
| Sign up (`sign-up`) | [✅](pages/sign-up/default.html) | ➖ | ➖ | [✅](pages/sign-up/error.html) | [✅](pages/sign-up/email.html) | [✅](pages/sign-up/invalid.html) | [✅](pages/sign-up/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-003`, `L2-052` |
| Enter your code (`verify-code`) | [✅](pages/verify-code/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/verify-code/invalid.html) | [✅](pages/verify-code/submitting.html) | [✅](pages/verify-code/expired.html) | [✅](pages/verify-code/name.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-004`, `L2-005`, `L2-053`, `L2-006` |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-006`, `L2-007` |
| Name your Popkin (`name-your-popkin`) | [✅](pages/name-your-popkin/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  | [✅](pages/name-your-popkin/blank.html) | [✅](pages/name-your-popkin/edge.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-008` |
| How long (`how-long`) | [✅](pages/how-long/default.html) | ➖ | ➖ | [✅](pages/how-long/error.html) |  |  | [✅](pages/how-long/submitting.html) |  |  |  |  | [✅](pages/how-long/custom.html) | [✅](pages/how-long/forever.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009` |
| Popkin created (`popkin-created`) | [✅](pages/popkin-created/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  | [✅](pages/popkin-created/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-010`, `L2-060` |
| Join invite (`join-invite`) | [✅](pages/join-invite/default.html) | [✅](pages/join-invite/loading.html) | ➖ | [✅](pages/join-invite/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/join-invite/wrapped.html) | [✅](pages/join-invite/not-found.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-012`, `L2-016`, `L2-051` |
| Join with a code (`join-code`) | [✅](pages/join-code/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/join-code/invalid.html) | [✅](pages/join-code/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-015`, `L2-053` |
| Your profile (`your-profile`) | [✅](pages/your-profile/default.html) | ➖ | ➖ | [✅](pages/your-profile/error.html) |  | [✅](pages/your-profile/invalid.html) | [✅](pages/your-profile/submitting.html) |  |  |  |  |  |  |  |  |  | [✅](pages/your-profile/with-photo.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-013` |
| You’re in (`youre-in`) | [✅](pages/youre-in/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-014`, `L2-060` |
| My Popkins (`my-popkins`) | [✅](pages/my-popkins/default.html) | [✅](pages/my-popkins/loading.html) | [✅](pages/my-popkins/empty.html) | [✅](pages/my-popkins/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/my-popkins/active-only.html) | [✅](pages/my-popkins/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-017`, `L2-018`, `L2-056` |
| Popkin home (`popkin-home`) | [✅](pages/popkin-home/default.html) | [✅](pages/popkin-home/loading.html) | [✅](pages/popkin-home/empty.html) | [✅](pages/popkin-home/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin-home/partial.html) | [✅](pages/popkin-home/ongoing.html) | [✅](pages/popkin-home/last-hour.html) | [✅](pages/popkin-home/last-hour-member.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-019`, `L2-011`, `L2-029`, `L2-044` |
| Conversations (`conversations`) | [✅](pages/conversations/default.html) | [✅](pages/conversations/loading.html) | [✅](pages/conversations/empty.html) | [✅](pages/conversations/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-022`, `L2-027` |
| Group chat (`group-chat`) | [✅](pages/group-chat/default.html) | [✅](pages/group-chat/loading.html) | [✅](pages/group-chat/empty.html) | [✅](pages/group-chat/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/group-chat/offline.html) |  |  |  |  | [✅](pages/group-chat/failed-send.html) | [✅](pages/group-chat/new-messages.html) | [✅](pages/group-chat/read-only.html) | [✅](pages/group-chat/marked.html) | [✅](pages/group-chat/deleted-quote.html) | [✅](pages/group-chat/photo-preview.html) | [✅](pages/group-chat/photo-refused.html) | [✅](pages/group-chat/photo-removed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-021`, `L2-024`, `L2-025`, `L2-026`, `L2-027`, `L2-028`, `L2-045`, `L2-036` |
| Direct message (`direct-message`) | [✅](pages/direct-message/default.html) | [✅](pages/direct-message/loading.html) | [✅](pages/direct-message/empty.html) | [✅](pages/direct-message/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/direct-message/read-only.html) |  |  |  |  |  | [✅](pages/direct-message/call.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-023`, `L2-024`, `L2-026`, `L2-030`, `L2-045`, `L2-051` |
| Video call (`video-call`) | [✅](pages/video-call/default.html) | [✅](pages/video-call/loading.html) | [✅](pages/video-call/empty.html) | [✅](pages/video-call/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/video-call/two.html) | [✅](pages/video-call/muted.html) | [✅](pages/video-call/camera-off.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-029`, `L2-030`, `L2-059` |
| Photo album (`photo-album`) | [✅](pages/photo-album/default.html) | [✅](pages/photo-album/loading.html) | [✅](pages/photo-album/empty.html) | [✅](pages/photo-album/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-album/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-album/mine.html) | [✅](pages/photo-album/no-results.html) | [✅](pages/photo-album/going.html) | [✅](pages/photo-album/removed.html) | [✅](pages/photo-album/photo-deleted.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-032`, `L2-031`, `L2-045`, `L2-036` |
| Photo view (`photo-view`) | [✅](pages/photo-view/default.html) | [✅](pages/photo-view/loading.html) | ➖ | [✅](pages/photo-view/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-view/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-view/removed.html) |  | [✅](pages/photo-view/not-reacted.html) | [✅](pages/photo-view/direct.html) | [✅](pages/photo-view/own-comment.html) | [✅](pages/photo-view/member.html) | [✅](pages/photo-view/reaction-failed.html) | [✅](pages/photo-view/save-failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-033`, `L2-034`, `L2-035`, `L2-036`, `L2-045`, `L2-056`, `L2-058`, `L2-059` |
| Experiences (`experiences`) | [✅](pages/experiences/default.html) | [✅](pages/experiences/loading.html) | [✅](pages/experiences/empty.html) | [✅](pages/experiences/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/no-results.html) |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/did.html) | [✅](pages/experiences/want.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-037`, `L2-040`, `L2-045` |
| Experience detail (`experience-detail`) | [✅](pages/experience-detail/default.html) | [✅](pages/experience-detail/loading.html) | ➖ | [✅](pages/experience-detail/error.html) |  |  |  |  |  |  |  |  |  |  | [✅](pages/experience-detail/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experience-detail/want.html) | [✅](pages/experience-detail/own.html) | [✅](pages/experience-detail/rated.html) | [✅](pages/experience-detail/want-keen.html) | [✅](pages/experience-detail/want-own.html) |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-039`, `L2-040`, `L2-041`, `L2-042`, `L2-045` |
| Wrap up (`wrap-up`) | [✅](pages/wrap-up/default.html) | ➖ | ➖ | [✅](pages/wrap-up/error.html) |  |  | [✅](pages/wrap-up/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrap-up/album-off.html) |  |  |  |  |  |  |  |  | `L2-043` |
| Wrapped up (`wrapped-up`) | [✅](pages/wrapped-up/default.html) | [✅](pages/wrapped-up/loading.html) | ➖ | [✅](pages/wrapped-up/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrapped-up/host.html) | [✅](pages/wrapped-up/exporting.html) | [✅](pages/wrapped-up/plain.html) |  |  |  |  |  | `L2-046`, `L2-045` |
| Your account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) |  | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/account/success.html) |  |  |  |  | `L2-048`, `L2-049`, `L2-059` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056`, `L2-052` |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Brand & components (`brand-components`) | [✅](pages/brand-components/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-057`, `L2-059` |
| Trip board (`trip-board`) | [✅](pages/trip-board/default.html) | [✅](pages/trip-board/loading.html) | [✅](pages/trip-board/empty.html) | [✅](pages/trip-board/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/trip-board/read-only.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/trip-board/off.html) |  |  |  | `L2-068`, `L2-069`, `L2-070`, `L2-077` |
| Burn-down (`burn-down`) | [✅](pages/burn-down/default.html) | [✅](pages/burn-down/loading.html) | [✅](pages/burn-down/empty.html) | [✅](pages/burn-down/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/burn-down/done.html) |  |  | `L2-071` |
| Time off (`time-off`) | [✅](pages/time-off/default.html) | [✅](pages/time-off/loading.html) | [✅](pages/time-off/empty.html) | [✅](pages/time-off/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/time-off/off.html) |  | [✅](pages/time-off/confirmed.html) |  | `L2-072`, `L2-073`, `L2-077` |
| This week (`this-week`) | [✅](pages/this-week/default.html) | [✅](pages/this-week/loading.html) | [✅](pages/this-week/empty.html) | [✅](pages/this-week/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/this-week/working.html) | `L2-074` |
| Features (admin) (`admin-features`) | [✅](pages/admin-features/default.html) | [✅](pages/admin-features/loading.html) | ➖ | [✅](pages/admin-features/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admin-features/off.html) |  |  |  | `L2-076`, `L2-077`, `L2-078` |
| Admin sign in (`admin-sign-in`) | [✅](pages/admin-sign-in/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078` |
| Not an admin (`admin-denied`) | [✅](pages/admin-denied/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078` |

### Dialogs

| Screen | default | busy | invalid | copied | denied | member | host-now | member-now | failed | no-results | mine | more | empty | own-comment | near-limit | error | read-only | edit | host | confirm | done | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Invite (`invite`) | [✅](dialogs/invite/default.html) | ➖ | ➖ | [✅](dialogs/invite/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-011` |
| Scan to join (`scan-to-join`) | [✅](dialogs/scan-to-join/default.html) | [✅](dialogs/scan-to-join/busy.html) | [✅](dialogs/scan-to-join/invalid.html) |  | [✅](dialogs/scan-to-join/denied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-015` |
| End date (`end-date`) | [✅](dialogs/end-date/default.html) | ➖ | [✅](dialogs/end-date/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009` |
| Popkin settings (`popkin-settings`) | [✅](dialogs/popkin-settings/default.html) | ➖ | ➖ |  |  | [✅](dialogs/popkin-settings/member.html) | [✅](dialogs/popkin-settings/host-now.html) | [✅](dialogs/popkin-settings/member-now.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-047` |
| Edit name and look (`edit-popkin`) | [✅](dialogs/edit-popkin/default.html) | [✅](dialogs/edit-popkin/busy.html) | [✅](dialogs/edit-popkin/invalid.html) |  |  |  |  |  | [✅](dialogs/edit-popkin/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-008` |
| Change how long it lasts (`change-length`) | [✅](dialogs/change-length/default.html) | [✅](dialogs/change-length/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/change-length/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-009` |
| Leave Popkin (`leave-popkin`) | [✅](dialogs/leave-popkin/default.html) | [✅](dialogs/leave-popkin/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/leave-popkin/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-047` |
| New message (`new-message`) | [✅](dialogs/new-message/default.html) | ➖ | ➖ |  |  |  |  |  |  | [✅](dialogs/new-message/no-results.html) |  |  |  |  |  |  |  |  |  |  |  | `L2-022` |
| Message actions (`reactions`) | [✅](dialogs/reactions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  | [✅](dialogs/reactions/mine.html) | [✅](dialogs/reactions/more.html) |  |  |  |  |  |  |  |  |  | `L2-024`, `L2-025`, `L2-023` |
| Delete message (`delete-message`) | [✅](dialogs/delete-message/default.html) | ➖ | ➖ |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  | `L2-024` |
| Add photos (`add-photos`) | [✅](dialogs/add-photos/default.html) | [✅](dialogs/add-photos/busy.html) | [✅](dialogs/add-photos/invalid.html) |  |  |  |  |  | [✅](dialogs/add-photos/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-031`, `L2-026`, `L2-052` |
| Photo comments (`photo-comments`) | [✅](dialogs/photo-comments/default.html) | [✅](dialogs/photo-comments/busy.html) | ➖ |  |  |  |  |  |  |  |  |  | [✅](dialogs/photo-comments/empty.html) | [✅](dialogs/photo-comments/own-comment.html) | [✅](dialogs/photo-comments/near-limit.html) | [✅](dialogs/photo-comments/error.html) | [✅](dialogs/photo-comments/read-only.html) |  |  |  |  | `L2-035`, `L2-045`, `L2-056` |
| Photo actions (`photo-actions`) | [✅](dialogs/photo-actions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036` |
| Delete photo (`delete-photo`) | [✅](dialogs/delete-photo/default.html) | [✅](dialogs/delete-photo/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/delete-photo/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036`, `L2-056` |
| Delete comment (`delete-comment`) | [✅](dialogs/delete-comment/default.html) | ➖ | ➖ |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  | `L2-035` |
| Share an experience (`share-experience`) | [✅](dialogs/share-experience/default.html) | [✅](dialogs/share-experience/busy.html) | [✅](dialogs/share-experience/invalid.html) |  |  |  |  |  | [✅](dialogs/share-experience/failed.html) |  |  |  |  |  |  |  |  | [✅](dialogs/share-experience/edit.html) |  |  |  | `L2-040`, `L2-052` |
| Add a comment (`add-comment`) | [✅](dialogs/add-comment/default.html) | [✅](dialogs/add-comment/busy.html) | [✅](dialogs/add-comment/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-041` |
| Experience actions (`experience-actions`) | [✅](dialogs/experience-actions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/experience-actions/host.html) |  |  | `L2-040` |
| Delete experience (`delete-experience`) | [✅](dialogs/delete-experience/default.html) | [✅](dialogs/delete-experience/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/delete-experience/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-040` |
| Sign out (`sign-out`) | [✅](dialogs/sign-out/default.html) | [✅](dialogs/sign-out/busy.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-048`, `L2-050` |
| Delete account (`delete-account`) | [✅](dialogs/delete-account/default.html) | [✅](dialogs/delete-account/busy.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/delete-account/confirm.html) |  | `L2-049` |
| New story (`new-story`) | [✅](dialogs/new-story/default.html) | [✅](dialogs/new-story/busy.html) | [✅](dialogs/new-story/invalid.html) |  |  |  |  |  | [✅](dialogs/new-story/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-069`, `L2-052` |
| Story (`story`) | [✅](dialogs/story/default.html) | [✅](dialogs/story/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/story/failed.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/story/done.html) | `L2-070` |
| Add my time off (`add-time-off`) | [✅](dialogs/add-time-off/default.html) | [✅](dialogs/add-time-off/busy.html) | [✅](dialogs/add-time-off/invalid.html) |  |  |  |  |  | [✅](dialogs/add-time-off/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-073` |
| My hours (`my-hours`) | [✅](dialogs/my-hours/default.html) | [✅](dialogs/my-hours/busy.html) | [✅](dialogs/my-hours/invalid.html) |  |  |  |  |  | [✅](dialogs/my-hours/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-074` |
| Turn off a feature (`turn-off-feature`) | [✅](dialogs/turn-off-feature/default.html) | [✅](dialogs/turn-off-feature/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/turn-off-feature/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-076` |

### Notifications

| Screen | info | success | warning | danger | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/stacked.html) |  | `L2-056`, `L2-053`, `L2-014` |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  | [✅](notifications/banner/persistent.html) | `L2-029`, `L2-044`, `L2-028`, `L2-045` |

<!-- coverage:end -->
