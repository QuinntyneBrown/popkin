# 04 · Journey 4: Popkin home

A member opens the home of a Popkin and sees it at a glance: who is in it and how long is left,
the latest of the chat, the photos, the experiences and the members. A new Popkin says what each
section is for; a section that fails says so on its own; Invite opens the QR code. The home is one
column on a phone with the tabs along the bottom; as the screen grows the tabs become the rail and
then the sidebar, and the home goes to two columns.

- **Film:** [`04-journey-04-popkin-home.mp4`](04-journey-04-popkin-home.mp4), 1920×1080, 30 fps,
  2 min 12 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 03. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-019 (AC1 to AC9), L2-027 AC3,
  L2-011 (AC1, AC2, AC4), L2-058 AC8, L2-059.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The home on a phone, dark, over an aurora | A Popkin, **at a glance.** |
| 0:08 | 7 | `header` | The home on a phone; the emoji, name, avatars and "14 members", the time left, and "Group call" and "Invite" close up | Who’s in, **how long.** |
| 0:22 | 7 | `chat` | The Chat card with "3 new", then with "Kettle is on" and "4 new"; the Chat tab with 3, then 4 | The latest, **and what’s new.** |
| 0:36 | 7 | `sections` | Photos, Experiences and Members, close up, one by one | Photos. Experiences. **Members.** |
| 0:50 | 6 | `empty` | The home of a new Popkin: "It’s just you so far", "No photos yet", "Nothing shared yet" | Never a **blank page.** |
| 1:02 | 5 | `partial` | "Photos didn’t load. The rest of the Popkin is fine." with "Try again", then the photos | One fails. **The rest is fine.** |
| 1:12 | 6 | `invite` | "Bring someone in" as a sheet on a phone; the QR code; "Copy invite link", then "Copied"; the dialog centred at 1440 px | Bring someone **in.** |
| 1:24 | 10 | `grow` | The home growing from 390 to 768, 1024 and 1440 px | One home, **every size.** |
| 1:44 | 5 | `wide` | The home at 1440 px, light then dark; three experiences and six members close up | More room, **more to see.** |
| 1:54 | 5 | `proof` | A card: what the tests prove, and what comes in later journeys | Proven by **tests.** |
| 2:04 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `chat`, `empty`, `invite`, `grow` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered by the home stub of
  `e2e/fixtures/home.ts` or the recording, and the hub by the stub of `e2e/fixtures/hub.ts`
  (ADR 0005, ADR 0010); no backend and no hub ran.
- **The photos, the experiences and their ratings are the stub's.** Nobody can add a photo, share
  an experience or rate one yet: those are later journeys. The film shows only that the home's
  sections show what exists (48 photos, "4.8 · 11 ratings") and says so when nothing does. "See
  all", a thumbnail, an experience, "Add the first photo" and "Share one" lead to screens that are
  not built, and the film opens none of them.
- **"Group call" is a link** in the Popkin's colour (L2-019 AC2); the call is a later journey and
  is not shown. Nor are Popkin settings, My Popkins or the recap.
- "Kettle is on" is pushed over the stubbed hub while the home is open on a phone, as the server
  sends a message to a thread; the card and its count change without a reload (L2-027 AC3), and
  so does the count on the Chat tab along the bottom. No two real devices were filmed.
- The clock of the pictures is the mocks' Saturday (12 September 2026) at twenty to noon on the
  device, twenty minutes before the specs' clock, so the time left reads "1 day 6 hrs" for every
  shot while the clock runs.
- The failing section is the stub answering 500 for the photos until it is told to stop.
- "Copied" is the app's own answer to "Copy invite link", with the clipboard allowed in the
  browser that took the pictures.
- The card "Proven by tests" counts the behaviour specs of `e2e/tests/popkin-home.spec.ts` and
  `e2e/tests/invite-dialog.spec.ts` on the day the film was built: 39. Its three lines are the API
  tests `Only_a_member_reads_the_header` and `Only_a_member_reads_a_summary`, and the behaviour
  specs "the time left moves on as the minutes pass" and "counts and lists someone who joins
  while the home is open".
- It leaves out, though they are built and tested: the loading skeletons, "We couldn’t open this
  Popkin", the not-found screen for someone who is not a member, a Popkin without an end date,
  closing the dialog and where focus returns (L2-011 AC3), and the toast when someone pops in.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/04-journey-04-popkin-home
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/04-journey-04-popkin-home
node tools/video-build/build.mjs docs/videos/04-journey-04-popkin-home
```
