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
Experiences: Sunrise canoe to Heron Point (4.8, 11 ratings, by Mara); La Paloma Taqueria (4.5, 9,
  Sam); Ridge trail loop (4.2, 8, Walt); Beach day next summer? (want to do, 7 keen, Ellie).
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
- **L2-058 still describes the earlier layout** (a centred column no wider than 30 rem from 576 px).
  The requirement has to be brought in line before the app follows these mocks.

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
- **Own reactions** are outlined as well as tinted, and the speaking ring is 3 px, so neither is
  carried by colour alone.

## Open questions

These are assumptions in `docs/specs/L2.md` that the designs do not settle. Each mock that
depends on one says so.

1. Sign in, the six-digit code screen and the account screen have no design; they are built from
   the sign-up step.
2. Where "Join with a code" leads: a screen to type the code or link (`join-code`).
3. What the Popkin settings menu (⋯ on the home) holds; the mocks give the Host edit, length,
   invite and wrap up, and a member invite and leave.
4. How a member says they are keen on a "Want to do" experience (`experience-detail/want`).
5. Safety, Privacy, Help, Terms and Contact have no pages yet; their links lead to `not-found`.

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

| Screen | default | loading | empty | error | email | invalid | submitting | expired | blank | edge | custom | forever | copied | wrapped | not-found | with-photo | active-only | offline | partial | ongoing | failed-send | read-only | two | muted | camera-off | mine | no-results | not-reacted | did | want | rated | album-off | host | success | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Landing (`landing`) | [✅](pages/landing/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-001`, `L2-002`, `L2-058`, `L2-061` |
| Welcome (`welcome`) | [✅](pages/welcome/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-002`, `L2-007`, `L2-015` |
| Sign up (`sign-up`) | [✅](pages/sign-up/default.html) | ➖ | ➖ | [✅](pages/sign-up/error.html) | [✅](pages/sign-up/email.html) | [✅](pages/sign-up/invalid.html) | [✅](pages/sign-up/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-003`, `L2-052` |
| Enter your code (`verify-code`) | [✅](pages/verify-code/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/verify-code/invalid.html) | [✅](pages/verify-code/submitting.html) | [✅](pages/verify-code/expired.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-004`, `L2-005`, `L2-053` |
| Sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-006`, `L2-007` |
| Name your Popkin (`name-your-popkin`) | [✅](pages/name-your-popkin/default.html) | ➖ | ➖ | ➖ |  |  |  |  | [✅](pages/name-your-popkin/blank.html) | [✅](pages/name-your-popkin/edge.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-008` |
| How long (`how-long`) | [✅](pages/how-long/default.html) | ➖ | ➖ | [✅](pages/how-long/error.html) |  |  | [✅](pages/how-long/submitting.html) |  |  |  | [✅](pages/how-long/custom.html) | [✅](pages/how-long/forever.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-009` |
| Popkin created (`popkin-created`) | [✅](pages/popkin-created/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  | [✅](pages/popkin-created/copied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-010`, `L2-060` |
| Join invite (`join-invite`) | [✅](pages/join-invite/default.html) | [✅](pages/join-invite/loading.html) | ➖ | [✅](pages/join-invite/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/join-invite/wrapped.html) | [✅](pages/join-invite/not-found.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-012`, `L2-016`, `L2-051` |
| Join with a code (`join-code`) | [✅](pages/join-code/default.html) | ➖ | ➖ | ➖ |  | [✅](pages/join-code/invalid.html) | [✅](pages/join-code/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-015`, `L2-053` |
| Your profile (`your-profile`) | [✅](pages/your-profile/default.html) | ➖ | ➖ | [✅](pages/your-profile/error.html) |  | [✅](pages/your-profile/invalid.html) | [✅](pages/your-profile/submitting.html) |  |  |  |  |  |  |  |  | [✅](pages/your-profile/with-photo.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-013` |
| You’re in (`youre-in`) | [✅](pages/youre-in/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-014`, `L2-060` |
| My Popkins (`my-popkins`) | [✅](pages/my-popkins/default.html) | [✅](pages/my-popkins/loading.html) | [✅](pages/my-popkins/empty.html) | [✅](pages/my-popkins/error.html) |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/my-popkins/active-only.html) | [✅](pages/my-popkins/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-017`, `L2-018`, `L2-056` |
| Popkin home (`popkin-home`) | [✅](pages/popkin-home/default.html) | [✅](pages/popkin-home/loading.html) | [✅](pages/popkin-home/empty.html) | [✅](pages/popkin-home/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin-home/partial.html) | [✅](pages/popkin-home/ongoing.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-019`, `L2-011`, `L2-029`, `L2-044` |
| Conversations (`conversations`) | [✅](pages/conversations/default.html) | [✅](pages/conversations/loading.html) | [✅](pages/conversations/empty.html) | [✅](pages/conversations/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-022`, `L2-027` |
| Group chat (`group-chat`) | [✅](pages/group-chat/default.html) | [✅](pages/group-chat/loading.html) | [✅](pages/group-chat/empty.html) | [✅](pages/group-chat/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/group-chat/failed-send.html) | [✅](pages/group-chat/read-only.html) |  |  |  |  |  |  |  |  |  |  |  |  | `L2-021`, `L2-024`, `L2-025`, `L2-026`, `L2-027`, `L2-028`, `L2-045` |
| Direct message (`direct-message`) | [✅](pages/direct-message/default.html) | [✅](pages/direct-message/loading.html) | [✅](pages/direct-message/empty.html) | [✅](pages/direct-message/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-023`, `L2-024`, `L2-026`, `L2-051` |
| Video call (`video-call`) | [✅](pages/video-call/default.html) | [✅](pages/video-call/loading.html) | [✅](pages/video-call/empty.html) | [✅](pages/video-call/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/video-call/two.html) | [✅](pages/video-call/muted.html) | [✅](pages/video-call/camera-off.html) |  |  |  |  |  |  |  |  |  | `L2-029`, `L2-030`, `L2-059` |
| Photo album (`photo-album`) | [✅](pages/photo-album/default.html) | [✅](pages/photo-album/loading.html) | [✅](pages/photo-album/empty.html) | [✅](pages/photo-album/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-album/mine.html) | [✅](pages/photo-album/no-results.html) |  |  |  |  |  |  |  | `L2-032`, `L2-031` |
| Photo view (`photo-view`) | [✅](pages/photo-view/default.html) | [✅](pages/photo-view/loading.html) | ➖ | [✅](pages/photo-view/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/photo-view/not-reacted.html) |  |  |  |  |  |  | `L2-033`, `L2-034`, `L2-035`, `L2-036`, `L2-059` |
| Experiences (`experiences`) | [✅](pages/experiences/default.html) | [✅](pages/experiences/loading.html) | [✅](pages/experiences/empty.html) | [✅](pages/experiences/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experiences/no-results.html) |  | [✅](pages/experiences/did.html) | [✅](pages/experiences/want.html) |  |  |  |  | `L2-037`, `L2-040` |
| Experience detail (`experience-detail`) | [✅](pages/experience-detail/default.html) | [✅](pages/experience-detail/loading.html) | ➖ | [✅](pages/experience-detail/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/experience-detail/want.html) | [✅](pages/experience-detail/rated.html) |  |  |  | `L2-038`, `L2-039`, `L2-041`, `L2-042` |
| Wrap up (`wrap-up`) | [✅](pages/wrap-up/default.html) | ➖ | ➖ | [✅](pages/wrap-up/error.html) |  |  | [✅](pages/wrap-up/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrap-up/album-off.html) |  |  | `L2-043` |
| Wrapped up (`wrapped-up`) | [✅](pages/wrapped-up/default.html) | [✅](pages/wrapped-up/loading.html) | ➖ | [✅](pages/wrapped-up/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/wrapped-up/host.html) |  | `L2-046`, `L2-045` |
| Your account (`account`) | [✅](pages/account/default.html) | [✅](pages/account/loading.html) | ➖ | [✅](pages/account/error.html) |  | [✅](pages/account/invalid.html) | [✅](pages/account/submitting.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/account/success.html) | `L2-048`, `L2-049`, `L2-059` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Something went wrong (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056`, `L2-052` |
| Offline (`offline`) | [✅](pages/offline/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-056` |
| Brand & components (`brand-components`) | [✅](pages/brand-components/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-057`, `L2-059` |

### Dialogs

| Screen | default | busy | invalid | copied | denied | member | failed | no-results | empty | confirm | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Invite (`invite`) | [✅](dialogs/invite/default.html) | ➖ | ➖ | [✅](dialogs/invite/copied.html) |  |  |  |  |  |  | `L2-011` |
| Scan to join (`scan-to-join`) | [✅](dialogs/scan-to-join/default.html) | [✅](dialogs/scan-to-join/busy.html) | [✅](dialogs/scan-to-join/invalid.html) |  | [✅](dialogs/scan-to-join/denied.html) |  |  |  |  |  | `L2-015` |
| End date (`end-date`) | [✅](dialogs/end-date/default.html) | ➖ | [✅](dialogs/end-date/invalid.html) |  |  |  |  |  |  |  | `L2-009` |
| Popkin settings (`popkin-settings`) | [✅](dialogs/popkin-settings/default.html) | ➖ | ➖ |  |  | [✅](dialogs/popkin-settings/member.html) |  |  |  |  | `L2-020`, `L2-047` |
| Edit name and look (`edit-popkin`) | [✅](dialogs/edit-popkin/default.html) | [✅](dialogs/edit-popkin/busy.html) | [✅](dialogs/edit-popkin/invalid.html) |  |  |  | [✅](dialogs/edit-popkin/failed.html) |  |  |  | `L2-020`, `L2-008` |
| Change how long it lasts (`change-length`) | [✅](dialogs/change-length/default.html) | [✅](dialogs/change-length/busy.html) | ➖ |  |  |  | [✅](dialogs/change-length/failed.html) |  |  |  | `L2-020`, `L2-009` |
| Leave Popkin (`leave-popkin`) | [✅](dialogs/leave-popkin/default.html) | [✅](dialogs/leave-popkin/busy.html) | ➖ |  |  |  |  |  |  |  | `L2-047` |
| New message (`new-message`) | [✅](dialogs/new-message/default.html) | ➖ | ➖ |  |  |  |  | [✅](dialogs/new-message/no-results.html) |  |  | `L2-022` |
| Message actions (`reactions`) | [✅](dialogs/reactions/default.html) | ➖ | ➖ |  |  |  |  |  |  |  | `L2-024`, `L2-025` |
| Add photos (`add-photos`) | [✅](dialogs/add-photos/default.html) | [✅](dialogs/add-photos/busy.html) | [✅](dialogs/add-photos/invalid.html) |  |  |  | [✅](dialogs/add-photos/failed.html) |  |  |  | `L2-031`, `L2-026`, `L2-052` |
| Photo comments (`photo-comments`) | [✅](dialogs/photo-comments/default.html) | [✅](dialogs/photo-comments/busy.html) | ➖ |  |  |  |  |  | [✅](dialogs/photo-comments/empty.html) |  | `L2-035` |
| Share an experience (`share-experience`) | [✅](dialogs/share-experience/default.html) | [✅](dialogs/share-experience/busy.html) | [✅](dialogs/share-experience/invalid.html) |  |  |  | [✅](dialogs/share-experience/failed.html) |  |  |  | `L2-040`, `L2-052` |
| Add a comment (`add-comment`) | [✅](dialogs/add-comment/default.html) | [✅](dialogs/add-comment/busy.html) | [✅](dialogs/add-comment/invalid.html) |  |  |  |  |  |  |  | `L2-041` |
| Sign out (`sign-out`) | [✅](dialogs/sign-out/default.html) | [✅](dialogs/sign-out/busy.html) | ➖ |  |  |  |  |  |  |  | `L2-048`, `L2-050` |
| Delete account (`delete-account`) | [✅](dialogs/delete-account/default.html) | [✅](dialogs/delete-account/busy.html) | ➖ |  |  |  |  |  |  | [✅](dialogs/delete-account/confirm.html) | `L2-049` |

### Notifications

| Screen | info | success | warning | danger | stacked | persistent | Requirements |
|---|---|---|---|---|---|---|---|
| Toast (`toast`) | [✅](notifications/toast/info.html) | [✅](notifications/toast/success.html) | [✅](notifications/toast/warning.html) | [✅](notifications/toast/danger.html) | [✅](notifications/toast/stacked.html) |  | `L2-056`, `L2-053`, `L2-014` |
| Banner (`banner`) | [✅](notifications/banner/info.html) | [✅](notifications/banner/success.html) | [✅](notifications/banner/warning.html) | [✅](notifications/banner/danger.html) |  | [✅](notifications/banner/persistent.html) | `L2-029`, `L2-044`, `L2-028`, `L2-045` |

<!-- coverage:end -->
