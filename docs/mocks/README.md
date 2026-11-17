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
Plan and Schedules are shown in another of Mara's Popkins: Cabin Week ’27 🛶, colour Sky, 6
  members (Mara, Walt, Dev, Ellie, Sam, Priya), ongoing. Its event is Mon 15 – Fri 19 Feb 2027.
  Sprint: "Planning sprint", Aug 30 – Sep 26 2026 (today is day 13 of 27; 14 days left);
  14 stories, 35 points in all, 24 left, 7 behind, finishes Sep 30 at this week's pace.
  Time off is entered by the week from Feb 1 to Mar 8 2027; Dev is tentative for the event week.
  This week runs Sat 12 – Fri 18 Sep; Wednesday is the evening all six are free, from 7:30 pm.
Admin app: its mocks are a separate set in admin/, with their own cast in admin/README.md.
Contacts: Mara's own address book (only she sees it). Its mocks are drawn from the Magic Patterns
  Contacts prototype, moved on 462 days (66 weeks) so weekdays hold: today there is Tuesday
  15 September 2026, 8:40 am. 13 people: Ada Okafor (Mum, turns 64 Oct 7), Chidi Okafor (brother,
  Manchester, married to Tomás Reyes Sep 26 2021), Ifeoma Okafor (sister), Grace Adeyemi (best
  friend from uni, turns 33 Sat Sep 19, marries Femi Bankole Dec 26), Ben Hale (uni friend;
  daughter Iris born Sep 4), Dev Patel (colleague), Sam Ortega (former manager), Ruth Lindqvist
  (next door, turns 78 Oct 24), Walt and Ellie Brennan and Joel Kim (Thursday group), Priya Nair
  (Tigers U9 parent), Tomás Reyes. Femi Bankole is the one being added. Closest: Ada, Chidi,
  Grace. Lunch with Chidi (every 2 weeks) is two days overdue; 8 follow-ups open, 6 of them
  promises. Groups: Mum's house, Chidi & Tomás, Thursday Night Group, Sheffield lot, Tigers U9,
  Studio design team.
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

### Contacts

Contacts (`contacts-today`, `contacts-people`, `contact-profile`, `add-contact`, `log-entry`,
`contacts-dates`, `contacts-follow-ups`, `contacts-habits`, `contacts-groups`,
`contacts-connections`, their dialogs and `contacts-toast`) come from the Contacts prototype in
the Popkin Community Platform OS. Where they differ from it:

- The section's tile is 📇 and its people take the accents of the existing cast; people without
  a photo (Ben, Sam, Priya, Joel, Tomás, Ifeoma, Femi) show initials.
- Phones show five tabs (Today, People, Dates, Follow-ups, Groups); Habits is reached from Today
  and Connections from Groups (and from People on wider screens), as in the design. "Your Popkins" leaves Contacts, and
  My Popkins gains a Contacts button beside New Popkin.
- Message and Call are `sms:` and `tel:` links, not in-app screens.
- On a phone, an open group keeps the Groups heading above it, with a back link.
- Profiles are drawn for Chidi, Grace and Femi only; the other names link to Chidi's.
- The empty, loading and error states, the invalid and busy states of the forms and dialogs,
  and the toasts are new.

### Notifications

Notification settings (`notification-settings`) and the four emails (`email-popkin-update`,
`email-daily-digest`, `email-birthday`, `email-plan-reminder`) come from the Popkin App ›
Notifications frame and the Email Notifications prototype in the Popkin Community Platform OS,
added on 17 November 2026. Where they differ from them:

- Dates move to the cast. The update, the digest and the wrap-up reminder arrive on Sat 12 Sep;
  the canoe is tomorrow, Sun 13 Sep; the birthday reminder for Grace arrives a week ahead, on
  Sat 12 Sep, and on the day, Sat 19 Sep.
- "Book the cabin at Pine Hollow" belongs to Cabin Week ’27, the Popkin with Plan on, so the
  plan-change update and the to-do reminder are about it, not Lakeside Weekend. Its second
  change is the van, which moved from 21 to 25 Sep, rather than the canoe's new time.
- Grace's birthday email has no "On your list": she has no birthday follow-up in the cast.
- The settings' tabs are a real tab list, and each tab has its own mock. The design's ink
  selection becomes the design system's option card and coral underline.
- An email is drawn as a mail client shows it: the subject is the page's one heading, then the
  600px card, then the footer. Every footer link lands on the settings state it describes (mute →
  `muted` or `birthday-off`, settings → `default`, unsubscribe → `unsubscribed`).
- Dark theme draws the email in the app's dark surfaces. Real mail clients choose for
  themselves.

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
6. Plan and Schedules (`plan-board`, `burn-down`, `time-off`, `this-week` and their dialogs)
   come from the Plan Board, Burn-down, Time off and This week designs. The designs, the
   requirements and the mocks all call the tab "Plan" (L1-017); a trip is one kind of event a
   Popkin gathers for, so no mock names a feature or a screen after it. The designs say the
   hours come "from everyone's work calendars"; the mocks have each member enter their own
   (`my-hours`), as L2-074 states, and a calendar connection is open. The story dialog
   (`story`) and the empty, loading and error states are new. The designs count each story's
   comments on its card; comments on a story come later (L2-068), so until they do no card or
   dialog shows a count. "Delete" in the story dialog shows for the person who added the story,
   its owner and the Host (`story/default`), and asks first (`delete-story`); anyone else sees no
   "Delete" (`story/no-delete`, seen by Sam). The home of Cabin Week ’27 with Plan and Schedules
   on shows the Plan section before the Schedule section (`popkin-home/plan`, L2-075 AC1), and
   its recap counts "12 of 14 stories done" (`wrapped-up/plan`, AC4). The burn-down's address
   with Plan off shows the same screen as the board's (`burn-down/off`, L2-077 AC2).
7. The admin app is a separate application (`frontend/projects/admin`); its screens, from the
   Popkin Admin designs in Magic Patterns, are a mock set of their own in [admin/](admin/index.html).
8. The earlier mocks of a Popkin's screens show four tabs. They now stand for a Popkin where
   Plan and Schedules are off (L2-077 AC1); the new screens show all six tabs.
9. The event of time off: settled by journey 22. The Host sets its label and its first and last
   day from "Popkin settings" (`popkin-settings/schedules`, `set-event`, L2-085); time off heads
   the event's days with its label ("Cabin week"). The home's Schedule section
   (`popkin-home/schedule`, `schedule-none`) shows a Popkin where Schedules is on and Plan is
   off, so its tabs are Home, Chat, Schedule, Photos and Experiences (L2-072 AC1).

10. Contacts is specified by L1-029 to L1-038 and L2-121 to L2-151, written from these mocks on
    15 November 2026. L1-029 says how it serves pop-up communities: Import from your Popkins,
    "Also in your Popkin", and a group's "Open" and "Start a Popkin with them" (L2-148). Nobody
    is told they were added, imported, connected or deleted (L2-122). Where two mocks disagreed,
    the requirement took one reading and the mocks changed to match:
    - A wedding's reminder is "1 month before" everywhere (Femi's profile and Add someone said
      "2 weeks before").
    - A profile's key date is "Birthday", not "Grace's birthday".
    - A milestone's yearly date nudges "on the day", the Milestones default (L2-134, L2-139).
    - A habit's rhythm is "Weekly", "Every 2 weeks" or "Monthly", as New habit offers; the list's
      "Every Sunday", "Every month" and "First Saturday of the month" became "Weekly" and
      "Monthly", "Sunday call with Mum" became "Sunday call with Ada", and New
      habit no longer says "On Wednesdays" (L2-145).
    - A connection reads in the person's own words ("Married", "Partner"), not "Chidi is his
      husband".
    - A promise says how and when it was made with the ways of talking in Log ("You promised ·
      In person, Sat").
    - The date reminder's message no longer says "You asked to hear a week ahead".
    - A contact is named, never given a pronoun, since nobody enters one ("Keep Chidi",
      "Grace is into") (L2-122 AC4).
    - A memory on the timeline reads as its caption ("Hot sauce night"), with no note of its own.
    - Groups has a Clubs heading only when a club exists (L2-146); the mocks draw none.
    - On a phone, Connections is reached from Groups; People's "Connections" shows from medium
      screens.

    What the mocks leave unsaid is open in `docs/detailed-designs/README.md`, Known gaps 99 to
    118, and no requirement assumes it. Sam's and Joel's "It's been a while" chips open Chidi's
    log, like the other undrawn profiles; each opens a log for that person (L2-125 AC7).

11. Notifications have no requirement or detailed design yet. The settings screen, the four
    emails and the admin Notifications page (in `admin/`) come only from the designs, so their
    manifest entries list no requirement except the birthday email (L1-033, L2-140). They need
    `engineering-requirements` and a detailed design before anything is built.
12. Which birthday email? Settled 17 November 2026: L2-140 withdrew the Monday email, so one
    email goes per date, as early as the member chooses (`email-birthday`), and the "Phone
    notifications" and "Monday email" switches left `contacts-dates` for `notification-settings`.
13. The Weekly digest can be chosen on `notification-settings` but has no email design. The
    "Show all 7 contacts with birthdays" link opens `contacts-dates/birthdays`, where the
    reminders can't be changed.
14. "I'm going" and "Can't make it" in the plan reminder answer from the email itself. That
    needs a signed, single-use link per member, which nothing specifies yet.

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

| Screen | default | loading | empty | error | playing | email | invalid | submitting | email-only | expired | name | blank | edge | custom | forever | plan-off | one | copied | wrapped | not-found | limited | with-photo | active-only | offline | done | no-results | family | grace | milestones | follow-ups | memories | edit | milestone | birthdays | promises | kept | detail | start | none | partial | ongoing | last-hour | last-hour-member | plan | schedule | schedule-none | failed-send | new-messages | read-only | marked | deleted-quote | photo-preview | photo-refused | photo-removed | reported | call | two | muted | camera-off | mine | going | removed | photo-deleted | not-reacted | direct | own-comment | member | reaction-failed | save-failed | read-only-report | did | want | own | rated | want-keen | want-own | album-off | host | exporting | plain | success | daily | popkins | people | birthday-off | unsubscribed | mute-search | mute-no-match | no-one-muted | no-birthdays | off-by-popkin | working | off | host-off | confirmed | other-week | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing (`landing`) | [✅](pages/landing/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-058`, `L2-061` |
| Welcome (`welcome`) | [✅](pages/welcome/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002`, `L2-007`, `L2-015` |
| Marketing home (`marketing-home`) | [✅](pages/marketing-home/default.html) | ➖ | ➖ | ➖ | [✅](pages/marketing-home/playing.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-079`, `L2-080`, `L2-081`, `L2-061` |
| Sign up (`sign-up`) | [✅](pages/sign-up/default.html) | ➖ | ➖ | [✅](pages/sign-up/error.html) |  | [✅](pages/sign-up/email.html) | [✅](pages/sign-up/invalid.html) | [✅](pages/sign-up/submitting.html) | [✅](pages/sign-up/email-only.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-003`, `L2-052`, `L2-084` |
| Enter your code (`verify-code`) | [✅](pages/verify-code/default.html) | ➖ | ➖ | ➖ |  |  | [✅](pages/verify-code/invalid.html) | [✅](pages/verify-code/submitting.html) |  | [✅](pages/verify-code/expired.html) | [✅](pages/verify-code/name.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-004`, `L2-005`, `L2-053`, `L2-006` |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | ➖ |  |  | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) | [✅](pages/sign-in/email-only.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-006`, `L2-007`, `L2-084` |
| Name your Popkin (`name-your-popkin`) | [✅](pages/name-your-popkin/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  | [✅](pages/name-your-popkin/blank.html) | [✅](pages/name-your-popkin/edge.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-008` |
| How long (`how-long`) | [✅](pages/how-long/default.html) | ➖ | ➖ | [✅](pages/how-long/error.html) |  |  |  | [✅](pages/how-long/submitting.html) |  |  |  |  |  | [✅](pages/how-long/custom.html) | [✅](pages/how-long/forever.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009`, `L2-152` |
| What it has (`what-it-has`) | [✅](pages/what-it-has/default.html) | ➖ | ➖ | [✅](pages/what-it-has/error.html) |  |  |  | [✅](pages/what-it-has/submitting.html) |  |  |  |  |  |  |  | [✅](pages/what-it-has/plan-off.html) | [✅](pages/what-it-has/one.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-152` |
| Popkin created (`popkin-created`) | [✅](pages/popkin-created/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin-created/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-010`, `L2-060` |
| Join invite (`join-invite`) | [✅](pages/join-invite/default.html) | [✅](pages/join-invite/loading.html) | ➖ | [✅](pages/join-invite/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/join-invite/wrapped.html) | [✅](pages/join-invite/not-found.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-012`, `L2-016`, `L2-051` |
| Join with a code (`join-code`) | [✅](pages/join-code/default.html) | ➖ | ➖ | ➖ |  |  | [✅](pages/join-code/invalid.html) | [✅](pages/join-code/submitting.html) |  |  |  | [✅](pages/join-code/blank.html) |  |  |  |  |  |  |  |  | [✅](pages/join-code/limited.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-015`, `L2-053` |
| Your profile (`your-profile`) | [✅](pages/your-profile/default.html) | ➖ | ➖ | [✅](pages/your-profile/error.html) |  |  | [✅](pages/your-profile/invalid.html) | [✅](pages/your-profile/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/your-profile/with-photo.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-013` |
| You’re in (`youre-in`) | [✅](pages/youre-in/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-014`, `L2-060` |
| My Popkins (`my-popkins`) | [✅](pages/my-popkins/default.html) | [✅](pages/my-popkins/loading.html) | [✅](pages/my-popkins/empty.html) | [✅](pages/my-popkins/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/my-popkins/active-only.html) | [✅](pages/my-popkins/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-017`, `L2-018`, `L2-056`, `L2-121` |
| Contacts · Today (`contacts-today`) | [✅](pages/contacts-today/default.html) | [✅](pages/contacts-today/loading.html) | [✅](pages/contacts-today/empty.html) | [✅](pages/contacts-today/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-today/done.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-125`, `L2-142` |
| Contacts · People (`contacts-people`) | [✅](pages/contacts-people/default.html) | [✅](pages/contacts-people/loading.html) | [✅](pages/contacts-people/empty.html) | [✅](pages/contacts-people/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-people/no-results.html) | [✅](pages/contacts-people/family.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-126`, `L2-127` |
| Contact profile (`contact-profile`) | [✅](pages/contact-profile/default.html) | [✅](pages/contact-profile/loading.html) | [✅](pages/contact-profile/empty.html) | [✅](pages/contact-profile/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contact-profile/not-found.html) |  |  |  |  |  |  |  | [✅](pages/contact-profile/grace.html) | [✅](pages/contact-profile/milestones.html) | [✅](pages/contact-profile/follow-ups.html) | [✅](pages/contact-profile/memories.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-122`, `L2-123`, `L2-128`, `L2-135`, `L2-136` |
| Add someone (`add-contact`) | [✅](pages/add-contact/default.html) | ➖ | ➖ | [✅](pages/add-contact/error.html) |  |  | [✅](pages/add-contact/invalid.html) | [✅](pages/add-contact/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/add-contact/edit.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-129`, `L2-130` |
| Log a conversation (`log-entry`) | [✅](pages/log-entry/default.html) | ➖ | ➖ | [✅](pages/log-entry/error.html) |  |  | [✅](pages/log-entry/invalid.html) | [✅](pages/log-entry/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/log-entry/milestone.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-133`, `L2-134` |
| Contacts · Dates (`contacts-dates`) | [✅](pages/contacts-dates/default.html) | [✅](pages/contacts-dates/loading.html) | [✅](pages/contacts-dates/empty.html) | [✅](pages/contacts-dates/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-dates/birthdays.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-137`, `L2-139`, `L2-140` |
| Contacts · Follow-ups (`contacts-follow-ups`) | [✅](pages/contacts-follow-ups/default.html) | [✅](pages/contacts-follow-ups/loading.html) | [✅](pages/contacts-follow-ups/empty.html) | [✅](pages/contacts-follow-ups/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-follow-ups/done.html) |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-follow-ups/promises.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-141`, `L2-142` |
| Contacts · Habits (`contacts-habits`) | [✅](pages/contacts-habits/default.html) | [✅](pages/contacts-habits/loading.html) | [✅](pages/contacts-habits/empty.html) | [✅](pages/contacts-habits/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-habits/kept.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-143`, `L2-144` |
| Contacts · Groups (`contacts-groups`) | [✅](pages/contacts-groups/default.html) | [✅](pages/contacts-groups/loading.html) | [✅](pages/contacts-groups/empty.html) | [✅](pages/contacts-groups/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-groups/detail.html) | [✅](pages/contacts-groups/start.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-146`, `L2-148` |
| Contacts · Connections (`contacts-connections`) | [✅](pages/contacts-connections/default.html) | [✅](pages/contacts-connections/loading.html) | [✅](pages/contacts-connections/empty.html) | [✅](pages/contacts-connections/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-connections/family.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/contacts-connections/none.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-121`, `L2-123`, `L2-149` |
| Popkin home (`popkin-home`) | [✅](pages/popkin-home/default.html) | [✅](pages/popkin-home/loading.html) | [✅](pages/popkin-home/empty.html) | [✅](pages/popkin-home/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin-home/partial.html) | [✅](pages/popkin-home/ongoing.html) | [✅](pages/popkin-home/last-hour.html) | [✅](pages/popkin-home/last-hour-member.html) | [✅](pages/popkin-home/plan.html) | [✅](pages/popkin-home/schedule.html) | [✅](pages/popkin-home/schedule-none.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-019`, `L2-011`, `L2-029`, `L2-044`, `L2-075` |
| Conversations (`conversations`) | [✅](pages/conversations/default.html) | [✅](pages/conversations/loading.html) | [✅](pages/conversations/empty.html) | [✅](pages/conversations/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-022`, `L2-027` |
| Group chat (`group-chat`) | [✅](pages/group-chat/default.html) | [✅](pages/group-chat/loading.html) | [✅](pages/group-chat/empty.html) | [✅](pages/group-chat/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/group-chat/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/group-chat/failed-send.html) | [✅](pages/group-chat/new-messages.html) | [✅](pages/group-chat/read-only.html) | [✅](pages/group-chat/marked.html) | [✅](pages/group-chat/deleted-quote.html) | [✅](pages/group-chat/photo-preview.html) | [✅](pages/group-chat/photo-refused.html) | [✅](pages/group-chat/photo-removed.html) | [✅](pages/group-chat/reported.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-021`, `L2-024`, `L2-025`, `L2-026`, `L2-027`, `L2-028`, `L2-045`, `L2-036`, `L2-108` |
| Direct message (`direct-message`) | [✅](pages/direct-message/default.html) | [✅](pages/direct-message/loading.html) | [✅](pages/direct-message/empty.html) | [✅](pages/direct-message/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/direct-message/read-only.html) |  |  |  |  |  |  | [✅](pages/direct-message/call.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-023`, `L2-024`, `L2-026`, `L2-030`, `L2-045`, `L2-051` |
| Video call (`video-call`) | [✅](pages/video-call/default.html) | [✅](pages/video-call/loading.html) | [✅](pages/video-call/empty.html) | [✅](pages/video-call/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/video-call/two.html) | [✅](pages/video-call/muted.html) | [✅](pages/video-call/camera-off.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-029`, `L2-030`, `L2-059` |
| Photo album (`photo-album`) | [✅](pages/photo-album/default.html) | [✅](pages/photo-album/loading.html) | [✅](pages/photo-album/empty.html) | [✅](pages/photo-album/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-album/wrapped.html) |  |  |  |  |  |  | [✅](pages/photo-album/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-album/mine.html) | [✅](pages/photo-album/going.html) | [✅](pages/photo-album/removed.html) | [✅](pages/photo-album/photo-deleted.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-032`, `L2-031`, `L2-045`, `L2-036` |
| Photo view (`photo-view`) | [✅](pages/photo-view/default.html) | [✅](pages/photo-view/loading.html) | ➖ | [✅](pages/photo-view/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-view/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-view/removed.html) |  | [✅](pages/photo-view/not-reacted.html) | [✅](pages/photo-view/direct.html) | [✅](pages/photo-view/own-comment.html) | [✅](pages/photo-view/member.html) | [✅](pages/photo-view/reaction-failed.html) | [✅](pages/photo-view/save-failed.html) | [✅](pages/photo-view/read-only-report.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-033`, `L2-034`, `L2-035`, `L2-036`, `L2-045`, `L2-056`, `L2-058`, `L2-059`, `L2-108` |
| Experiences (`experiences`) | [✅](pages/experiences/default.html) | [✅](pages/experiences/loading.html) | [✅](pages/experiences/empty.html) | [✅](pages/experiences/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/wrapped.html) |  |  |  |  |  |  | [✅](pages/experiences/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/did.html) | [✅](pages/experiences/want.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-037`, `L2-040`, `L2-045` |
| Experience detail (`experience-detail`) | [✅](pages/experience-detail/default.html) | [✅](pages/experience-detail/loading.html) | ➖ | [✅](pages/experience-detail/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experience-detail/wrapped.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experience-detail/want.html) | [✅](pages/experience-detail/own.html) | [✅](pages/experience-detail/rated.html) | [✅](pages/experience-detail/want-keen.html) | [✅](pages/experience-detail/want-own.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-038`, `L2-039`, `L2-040`, `L2-041`, `L2-042`, `L2-045` |
| Wrap up (`wrap-up`) | [✅](pages/wrap-up/default.html) | ➖ | ➖ | [✅](pages/wrap-up/error.html) |  |  |  | [✅](pages/wrap-up/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrap-up/album-off.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-043` |
| Wrapped up (`wrapped-up`) | [✅](pages/wrapped-up/default.html) | [✅](pages/wrapped-up/loading.html) | ➖ | [✅](pages/wrapped-up/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrapped-up/plan.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrapped-up/host.html) | [✅](pages/wrapped-up/exporting.html) | [✅](pages/wrapped-up/plain.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-046`, `L2-045`, `L2-075` |
| Your account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) |  |  | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/account/success.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-048`, `L2-049`, `L2-059` |
| Notifications (`notification-settings`) | [✅](pages/notification-settings/default.html) | [✅](pages/notification-settings/loading.html) | ➖ | [✅](pages/notification-settings/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notification-settings/muted.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notification-settings/daily.html) | [✅](pages/notification-settings/popkins.html) | [✅](pages/notification-settings/people.html) | [✅](pages/notification-settings/birthday-off.html) | [✅](pages/notification-settings/unsubscribed.html) | [✅](pages/notification-settings/mute-search.html) | [✅](pages/notification-settings/mute-no-match.html) | [✅](pages/notification-settings/no-one-muted.html) | [✅](pages/notification-settings/no-birthdays.html) | [✅](pages/notification-settings/off-by-popkin.html) |  |  |  |  |  |  |
| Unsubscribe (`unsubscribe`) | [✅](pages/unsubscribe/default.html) | ➖ | ➖ | [✅](pages/unsubscribe/error.html) |  |  |  |  |  | [✅](pages/unsubscribe/expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/unsubscribe/working.html) |  |  |  |  | `L2-168` |
| Terms (`terms`) | [✅](pages/terms/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-083`, `L2-003`, `L2-058` |
| Privacy notice (`privacy`) | [✅](pages/privacy/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-082`, `L2-058` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056`, `L2-052` |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Brand & components (`brand-components`) | [✅](pages/brand-components/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-057`, `L2-059` |
| Plan board (`plan-board`) | [✅](pages/plan-board/default.html) | [✅](pages/plan-board/loading.html) | [✅](pages/plan-board/empty.html) | [✅](pages/plan-board/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/plan-board/read-only.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/plan-board/off.html) | [✅](pages/plan-board/host-off.html) |  |  | `L2-068`, `L2-069`, `L2-070`, `L2-077`, `L2-153` |
| Burn-down (`burn-down`) | [✅](pages/burn-down/default.html) | [✅](pages/burn-down/loading.html) | [✅](pages/burn-down/empty.html) | [✅](pages/burn-down/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/burn-down/done.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/burn-down/off.html) |  |  |  | `L2-071`, `L2-077` |
| Time off (`time-off`) | [✅](pages/time-off/default.html) | [✅](pages/time-off/loading.html) | [✅](pages/time-off/empty.html) | [✅](pages/time-off/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/time-off/off.html) |  | [✅](pages/time-off/confirmed.html) | [✅](pages/time-off/other-week.html) | `L2-072`, `L2-073`, `L2-077` |
| This week (`this-week`) | [✅](pages/this-week/default.html) | [✅](pages/this-week/loading.html) | [✅](pages/this-week/empty.html) | [✅](pages/this-week/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/this-week/working.html) |  |  |  |  | `L2-074` |

### Dialogs

| Screen | default | busy | invalid | copied | denied | schedules | member | host-now | member-now | saving | error | failed | no-results | mine | more | reported | current | current-more | empty | own-comment | near-limit | read-only | report | edit | host | current-host | confirm | no-delete | done | choose | loading | nobody | not-closest | chosen | file | note | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Add a promise (`add-promise`) | [✅](dialogs/add-promise/default.html) | ➖ | [✅](dialogs/add-promise/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-133` |
| Invite (`invite`) | [✅](dialogs/invite/default.html) | ➖ | ➖ | [✅](dialogs/invite/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-011` |
| Scan to join (`scan-to-join`) | [✅](dialogs/scan-to-join/default.html) | [✅](dialogs/scan-to-join/busy.html) | [✅](dialogs/scan-to-join/invalid.html) |  | [✅](dialogs/scan-to-join/denied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-015` |
| End date (`end-date`) | [✅](dialogs/end-date/default.html) | ➖ | [✅](dialogs/end-date/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009` |
| Popkin settings (`popkin-settings`) | [✅](dialogs/popkin-settings/default.html) | ➖ | ➖ |  |  | [✅](dialogs/popkin-settings/schedules.html) | [✅](dialogs/popkin-settings/member.html) | [✅](dialogs/popkin-settings/host-now.html) | [✅](dialogs/popkin-settings/member-now.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-047`, `L2-085`, `L2-153` |
| Features (`popkin-features`) | [✅](dialogs/popkin-features/default.html) | ➖ | ➖ |  |  |  |  |  |  | [✅](dialogs/popkin-features/saving.html) | [✅](dialogs/popkin-features/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-153` |
| Edit name and look (`edit-popkin`) | [✅](dialogs/edit-popkin/default.html) | [✅](dialogs/edit-popkin/busy.html) | [✅](dialogs/edit-popkin/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/edit-popkin/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-008` |
| Change how long it lasts (`change-length`) | [✅](dialogs/change-length/default.html) | [✅](dialogs/change-length/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/change-length/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-020`, `L2-009` |
| Leave Popkin (`leave-popkin`) | [✅](dialogs/leave-popkin/default.html) | [✅](dialogs/leave-popkin/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/leave-popkin/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-047` |
| New message (`new-message`) | [✅](dialogs/new-message/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  | [✅](dialogs/new-message/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-022` |
| Message actions (`reactions`) | [✅](dialogs/reactions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/reactions/mine.html) | [✅](dialogs/reactions/more.html) | [✅](dialogs/reactions/reported.html) | [✅](dialogs/reactions/current.html) | [✅](dialogs/reactions/current-more.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-024`, `L2-025`, `L2-023`, `L2-108` |
| Report (`report`) | [✅](dialogs/report/default.html) | [✅](dialogs/report/busy.html) | [✅](dialogs/report/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/report/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-108` |
| Delete message (`delete-message`) | [✅](dialogs/delete-message/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-024` |
| Add photos (`add-photos`) | [✅](dialogs/add-photos/default.html) | [✅](dialogs/add-photos/busy.html) | [✅](dialogs/add-photos/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/add-photos/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-031`, `L2-026`, `L2-052` |
| Photo comments (`photo-comments`) | [✅](dialogs/photo-comments/default.html) | [✅](dialogs/photo-comments/busy.html) | ➖ |  |  |  |  |  |  |  | [✅](dialogs/photo-comments/error.html) |  |  |  |  |  |  |  | [✅](dialogs/photo-comments/empty.html) | [✅](dialogs/photo-comments/own-comment.html) | [✅](dialogs/photo-comments/near-limit.html) | [✅](dialogs/photo-comments/read-only.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-035`, `L2-045`, `L2-056` |
| Photo actions (`photo-actions`) | [✅](dialogs/photo-actions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/photo-actions/reported.html) |  |  |  |  |  |  | [✅](dialogs/photo-actions/report.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036`, `L2-108` |
| Delete photo (`delete-photo`) | [✅](dialogs/delete-photo/default.html) | [✅](dialogs/delete-photo/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/delete-photo/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-036`, `L2-056` |
| Delete comment (`delete-comment`) | [✅](dialogs/delete-comment/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-035` |
| Share an experience (`share-experience`) | [✅](dialogs/share-experience/default.html) | [✅](dialogs/share-experience/busy.html) | [✅](dialogs/share-experience/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/share-experience/failed.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/share-experience/edit.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-040`, `L2-052` |
| Add a comment (`add-comment`) | [✅](dialogs/add-comment/default.html) | [✅](dialogs/add-comment/busy.html) | [✅](dialogs/add-comment/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-041` |
| Experience actions (`experience-actions`) | [✅](dialogs/experience-actions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/experience-actions/reported.html) |  |  |  |  |  |  | [✅](dialogs/experience-actions/report.html) |  | [✅](dialogs/experience-actions/host.html) | [✅](dialogs/experience-actions/current-host.html) |  |  |  |  |  |  |  |  |  |  | `L2-040`, `L2-108` |
| Delete experience (`delete-experience`) | [✅](dialogs/delete-experience/default.html) | [✅](dialogs/delete-experience/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/delete-experience/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-040` |
| Sign out (`sign-out`) | [✅](dialogs/sign-out/default.html) | [✅](dialogs/sign-out/busy.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-048`, `L2-050` |
| Delete account (`delete-account`) | [✅](dialogs/delete-account/default.html) | [✅](dialogs/delete-account/busy.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/delete-account/confirm.html) |  |  |  |  |  |  |  |  |  | `L2-049` |
| New story (`new-story`) | [✅](dialogs/new-story/default.html) | [✅](dialogs/new-story/busy.html) | [✅](dialogs/new-story/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/new-story/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-069`, `L2-052` |
| Story (`story`) | [✅](dialogs/story/default.html) | [✅](dialogs/story/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/story/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/story/no-delete.html) | [✅](dialogs/story/done.html) |  |  |  |  |  |  |  | `L2-070` |
| Delete story (`delete-story`) | [✅](dialogs/delete-story/default.html) | [✅](dialogs/delete-story/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/delete-story/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-070` |
| Set the event (`set-event`) | [✅](dialogs/set-event/default.html) | [✅](dialogs/set-event/busy.html) | [✅](dialogs/set-event/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/set-event/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-085` |
| Add my time off (`add-time-off`) | [✅](dialogs/add-time-off/default.html) | [✅](dialogs/add-time-off/busy.html) | [✅](dialogs/add-time-off/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/add-time-off/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-073` |
| My hours (`my-hours`) | [✅](dialogs/my-hours/default.html) | [✅](dialogs/my-hours/busy.html) | [✅](dialogs/my-hours/invalid.html) |  |  |  |  |  |  |  |  | [✅](dialogs/my-hours/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-074` |
| New habit (`new-habit`) | [✅](dialogs/new-habit/default.html) | [✅](dialogs/new-habit/busy.html) | [✅](dialogs/new-habit/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/new-habit/choose.html) |  |  |  |  |  |  | `L2-123`, `L2-145` |
| Add a date (`add-date`) | [✅](dialogs/add-date/default.html) | [✅](dialogs/add-date/busy.html) | [✅](dialogs/add-date/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-138` |
| New group (`new-group`) | [✅](dialogs/new-group/default.html) | [✅](dialogs/new-group/busy.html) | [✅](dialogs/new-group/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-147` |
| Connect two people (`connect-person`) | [✅](dialogs/connect-person/default.html) | [✅](dialogs/connect-person/busy.html) | [✅](dialogs/connect-person/invalid.html) |  |  |  |  |  |  |  |  |  | [✅](dialogs/connect-person/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/connect-person/choose.html) |  |  |  |  |  |  | `L2-123`, `L2-150` |
| Import from your Popkins (`import-contacts`) | [✅](dialogs/import-contacts/default.html) | [✅](dialogs/import-contacts/busy.html) | ➖ |  |  |  |  |  |  |  | [✅](dialogs/import-contacts/error.html) | [✅](dialogs/import-contacts/failed.html) |  |  |  |  |  |  | [✅](dialogs/import-contacts/empty.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/import-contacts/loading.html) | [✅](dialogs/import-contacts/nobody.html) |  |  |  |  | `L2-123`, `L2-151` |
| Contact actions (`contact-actions`) | [✅](dialogs/contact-actions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/contact-actions/not-closest.html) |  |  |  | `L2-131` |
| Delete a contact (`delete-contact`) | [✅](dialogs/delete-contact/default.html) | [✅](dialogs/delete-contact/busy.html) | ➖ |  |  |  |  |  |  |  |  | [✅](dialogs/delete-contact/failed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-132` |
| Add to memories (`add-memory`) | [✅](dialogs/add-memory/default.html) | [✅](dialogs/add-memory/busy.html) | [✅](dialogs/add-memory/invalid.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](dialogs/add-memory/chosen.html) | [✅](dialogs/add-memory/file.html) | [✅](dialogs/add-memory/note.html) | `L2-123`, `L2-136` |
| Add people to a group (`group-add-people`) | [✅](dialogs/group-add-people/default.html) | [✅](dialogs/group-add-people/busy.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-123`, `L2-147` |

### Notifications

| Screen | info | success | warning | danger | message | photos | plan | member | single | needs-you | quiet | ahead | today | event | task | wrap-up | stacked | persistent | notice | long | call | blocked | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Email · Popkin update (`email-popkin-update`) | ➖ | ➖ | ➖ | ➖ | [✅](notifications/email-popkin-update/message.html) | [✅](notifications/email-popkin-update/photos.html) | [✅](notifications/email-popkin-update/plan.html) | [✅](notifications/email-popkin-update/member.html) | [✅](notifications/email-popkin-update/single.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Email · Daily digest (`email-daily-digest`) | ➖ | ➖ | ➖ | ➖ |  |  |  |  |  | [✅](notifications/email-daily-digest/needs-you.html) | [✅](notifications/email-daily-digest/quiet.html) |  |  |  |  |  |  |  |  |  |  |  |  |
| Email · Birthday reminder (`email-birthday`) | ➖ | ➖ | ➖ | ➖ |  |  |  |  |  |  |  | [✅](notifications/email-birthday/ahead.html) | [✅](notifications/email-birthday/today.html) |  |  |  |  |  |  |  |  |  | `L1-033`, `L2-140` |
| Email · Plan reminder (`email-plan-reminder`) | ➖ | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  | [✅](notifications/email-plan-reminder/event.html) | [✅](notifications/email-plan-reminder/task.html) | [✅](notifications/email-plan-reminder/wrap-up.html) |  |  |  |  |  |  |  |
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) |  |  |  |  |  |  |  |  |  |  |  |  | [✅](notifications/toast/stacked.html) |  |  |  |  |  | `L2-056`, `L2-053`, `L2-014` |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](notifications/banner/persistent.html) |  |  |  |  | `L2-029`, `L2-044`, `L2-028`, `L2-045` |
| Announcement (`announcement`) | ➖ | ➖ | [✅](notifications/announcement/warning.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](notifications/announcement/notice.html) | [✅](notifications/announcement/long.html) | [✅](notifications/announcement/call.html) |  | `L2-116` |
| Contacts toasts (`contacts-toast`) | [✅](notifications/contacts-toast/info.html) | [✅](notifications/contacts-toast/success.html) | [✅](notifications/contacts-toast/warning.html) | [✅](notifications/contacts-toast/danger.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](notifications/contacts-toast/blocked.html) | `L2-123`, `L2-124`, `L2-140` |

<!-- coverage:end -->
