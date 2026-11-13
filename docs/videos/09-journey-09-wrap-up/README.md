# 09 · Journey 9: Wrap up

Every good Popkin ends. The Host opens Popkin settings on the Popkin home and chooses "Wrap up".
The wrap-up screen asks "Wrap up Lakeside Weekend?", says what happens next for all 14 of you and
has "Keep the photo album" on. "Wrap it up" reads "Wrapping up…", then the recap opens: "This
Popkin wrapped up. What a time.", with the people who showed up, the messages sent, the photos
shared and the top-rated moment. "Save the album" prepares a zip and shows its progress. The chat,
Photos and Experiences stay readable and nothing can be added. A Popkin with an end date says
"1 hour left." in its last hour and wraps up by itself. From the recap the Host can "Pop up
another with this crew"; a member can "Start your own Popkin".

- **Film:** [`09-journey-09-wrap-up.mp4`](09-journey-09-wrap-up.mp4), 1920×1080, 30 fps,
  2 min 20 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 08. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-020 (AC1, AC2: "Invite people" and "Wrap up" for the Host), L2-043
  (AC1 to AC3), L2-044 (AC2), L2-045 (AC1, AC3, AC4: the notice of the days left), L2-046 (AC1 to
  AC4, and the buttons of AC5 and AC6), L2-058 (the recap and the wrap-up screen as the screen
  grows).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The recap on a phone, in the dark theme, over an aurora | Every good Popkin **ends.** |
| 0:08 | 5 | `settings` | The Popkin home on a phone, then Popkin settings; its button, the dialog and "Wrap up", "End it now and send the recap" close up | Popkin settings, **Wrap up.** |
| 0:18 | 8 | `ask` | The wrap-up screen; "Wrap up Lakeside Weekend?", "Everyone gets a recap" and "Chat goes quiet" close up; "Keep the photo album" on, then off with "Photos are removed after 30 days" | What happens **next.** |
| 0:34 | 4 | `wrapping` | "Wrap it up", then "Wrapping up…", then the recap on the same phone | Wrap it **up.** |
| 0:42 | 7 | `recap` | The recap on a phone, with confetti; "14 people showed up", "1,286 messages sent", "48 photos shared" and "Top-rated moment" close up | What a **time.** |
| 0:56 | 6 | `album` | "Save the album", then "Preparing the album…" with "Preparing 12 of 48"; then the recap under "Photos go in 12 days." | Every photo, **in a zip.** |
| 1:08 | 7 | `readonly` | The Everyone thread with "Wrapped up Sun 13 Sep" and the line in place of the field; then Photos, Experiences and an experience on three phones | Still **readable.** |
| 1:22 | 7 | `lasthour` | The Popkin home in its last hour; the Host's banner with "Change" and a member's close up; then the recap | 1 hour **left.** |
| 1:36 | 4 | `next` | The recap of the Host and of a member on two phones; "Pop up another with this crew" and "Start your own Popkin" close up | What’s **next?** |
| 1:44 | 7 | `grow` | The recap growing from 390 to 768, 1024 and 1440 px; then the wrap-up screen at 768 px, the recap it will make close up | One column, **then two.** |
| 1:58 | 7 | `proof` | A card: what no screen shows and what is still to come | Nothing new **is added.** |
| 2:12 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `recap`, `lasthour`, `grow` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every state is one of `e2e/fixtures/wrap-up-states.ts`,
  opened by its key in `e2e/fixtures/routes.ts`; every `/api` request was answered in memory by
  `e2e/fixtures/wrap-up.ts`, the stubs of the home, the album and the experiences, or the
  recording (ADR 0005); no backend and no database ran. Nothing the film shows was saved anywhere.
- **The Popkin is the mocks' Lakeside Weekend**, whose Host is Mara: 14 members, 1,286 messages,
  48 photos, and the sunrise canoe as its top-rated moment. It wrapped up on Sunday 13 September
  at 6 pm; the recap is read on the Monday after.
- **The scenes are separate takes**, each a state of its own. The recap that follows "Wrapping
  up…" in `wrapping` is the Host's recap state, not the answer to that press; the film does not
  show one press carrying through to the recap, which `e2e/tests/wrap-up.spec.ts` proves.
- **"For everyone who has the Popkin open" is said, not shown.** The film has one screen at a
  time; that an open home or thread moves to the recap without a reload is proved by
  `e2e/tests/wrap-up-live.spec.ts`. The same holds for "it wraps up by itself": the cut from the
  last hour to the recap in `lasthour` is two states, not a clock running out.
- **The two banners of `lasthour` are two moments**: the Host's at the start of the last hour
  ("1 hour left.", with "Change"), a member's later in it ("42 min left.", with nothing to
  change). The label says so. Beside "1 hour left." the header of the home reads "59 min left":
  the banner says "1 hour left." for the hour's first minute.
- **"Change" does not change anything yet.** It opens Popkin settings until "Change how long it
  lasts" is built (journey 16); the film shows the button and names the dialog as still to come.
- "Save the album" is shown being prepared ("Preparing 12 of 48"); the download itself is not on
  screen. "Photos go in 12 days." is the recap of a Popkin whose album was not kept, a different
  take from the album being saved.
- "Pop up another with this crew" and "Start your own Popkin" are shown as buttons; "Name your
  Popkin" opening, and the crew being sent the new invite, are not on screen.
- **Nothing on screen shows** that every request to add to a wrapped-up Popkin is refused, that
  a member who is not the Host cannot wrap it up, or that a Popkin whose time is up wraps up
  within one minute; the film says so on a card.
- Not built, and not claimed: "Edit name and look" and "Change how long it lasts" (journey 16),
  "Leave this Popkin" (journey 18). The card names the second as still to come.
- It leaves out, though they are built and tested: Popkin settings for a member who is not the
  Host; "Not yet" and "Back"; the wrap-up screen failing ("We couldn’t wrap it up.") and what it
  shows failing to load; the recap loading, failing, with no photos and with nothing rated; the
  album that cannot be prepared; "Read the chat" and its way back to the recap; the banner
  dismissed, and on the other screens of the Popkin; Photos with its notice of the days left and
  "The photos were removed"; an invite link to a wrapped-up Popkin; and the not-found screen.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/09-journey-09-wrap-up
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/09-journey-09-wrap-up
node tools/video-build/build.mjs docs/videos/09-journey-09-wrap-up --crf 23
```
