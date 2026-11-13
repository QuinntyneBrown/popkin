# 10 · Journey 10: Discover Popkin

Before anyone joins a Popkin, they find it. A visitor opens `/` and reads the landing page: the
hero, "Your people, popped up in seconds.", with "Start a Popkin", "Free. Takes about a minute."
and a preview of Lakeside Weekend; "Scan. Join. You’re in." with its three steps; four ideas,
Small group, Hackathon, Team and Family trip; "Better than a group chat." with its five rows;
"Free. Like, actually free."; and the footer. "How it works" and "Ideas" jump to their sections.
On a phone the navigation keeps "Start a Popkin" and "Sign in" is in the footer. "Start a Popkin"
opens sign-up and "Sign in" opens sign-in; a person who is already signed in gets My Popkins.
Then the welcome screen: Start a Popkin, Join with a code and "Already have an account? Sign in".

- **Film:** [`10-journey-10-discover-popkin.mp4`](10-journey-10-discover-popkin.mp4), 1920×1080,
  30 fps, 2 min 26 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 09. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-001 (AC1 to AC6: the hero, the three steps, the four ideas, the
  comparison, one column on a phone, the hero beside its preview and four ideas across from
  1024 px), L2-002 (AC1 to AC5: "Start a Popkin", "Sign in", My Popkins for a signed-in person,
  the phone's navigation, the links to the sections; and the welcome screen), L2-061 (AC3: free,
  no ads, no premium tier), L2-058 (the welcome screen split from 768 px, its two actions side
  by side from 1280 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The landing page on a phone, in the dark theme, over an aurora | The front **door.** |
| 0:08 | 8 | `hero` | The landing page on a phone; the hero's words, "Start a Popkin" and "Free. Takes about a minute." close up; then the preview of Lakeside Weekend | Popped up **in seconds.** |
| 0:24 | 5 | `how` | "Pop one up", "Share the QR code" and "You’re together" close up, one by one | Scan. Join. **You’re in.** |
| 0:34 | 7 | `ideas` | "For every group that forms around a table."; then the four idea cards, one by one | Four **ideas.** |
| 0:48 | 6 | `compare` | The comparison on a phone and, close up, as a desktop draws it; its last row, "The end" | Better than a **group chat.** |
| 1:00 | 4 | `free` | "Free. Like, actually free." close up; then the footer | Actually **free.** |
| 1:08 | 4 | `jump` | The landing page in a browser window, then at "Scan. Join. You’re in.", then at the ideas; the navigation and each heading close up | Jump to a **section.** |
| 1:16 | 4 | `phonenav` | The landing page on a phone, top and bottom; its navigation and the footer's "Sign in" close up | On a **phone.** |
| 1:24 | 6 | `actions` | The sign-up screen, the sign-in screen and My Popkins on three phones | Where each **leads.** |
| 1:36 | 6 | `welcome` | The welcome screen on a phone; "Start a Popkin", "Join with a code" and "Already have an account? Sign in" close up; the screen in the dark theme | Three ways **on.** |
| 1:48 | 9 | `grow` | The landing page growing from 390 to 768, 1024 and 1440 px; its ideas at 1440 px; then the welcome screen at 768 and 1440 px | One column, **then four.** |
| 2:06 | 6 | `proof` | A card: what no screen shows and what is still to come | Nothing from **elsewhere.** |
| 2:18 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `jump`, `welcome`, `grow` and `proof`);
inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. The landing page and the welcome screen are opened by
  their keys in `e2e/fixtures/routes.ts` (`landing`, `welcome`) as a visitor (`asVisitor` of
  `e2e/fixtures/journeys.ts`); every `/api` request was answered in memory by the fixtures or
  the recording (ADR 0005); no backend and no database ran.
- **The preview in the hero is a picture of a Popkin, not a Popkin.** Lakeside Weekend, "14
  here" and "Wraps up Sunday" are the landing page's own words; nothing is read from the API.
  The preview's QR code is not drawn at a phone's width, so `hero` does not show it; `grow`
  does, from 768 px.
- **The scenes are separate takes.** In `jump` the three pictures are the page as it opens,
  after "How it works" was followed and after "Ideas" was followed; the scroll itself is not on
  screen. That focus moves to the heading is said and labelled, not seen:
  `e2e/tests/landing.spec.ts` proves it.
- **`actions` shows where each action leads, not the press.** The sign-up screen is the one
  "Start a Popkin" in the hero opened, the sign-in screen the one "Sign in" in the phone's footer
  opened; the film does not show the other two "Start a Popkin" buttons or the navigation's
  "Sign in" being followed, which the same spec proves. My Popkins is what `/` opened for Mara,
  signed in, with the mocks' five Popkins; its heading reads "Your Popkins".
- **"Join with a code" has no screen yet.** The welcome screen shows the button and it leads to
  `/join`; the screen behind it is journey 15, and the film says so on its card. "Safety",
  "Privacy" and "Help" in the footer have no page either, and the card says that too.
- **Four ideas across is shown at 1440 px.** `shots.ts` also saves the ideas at 390 px (one
  across), 768 px (two) and 1024 px (four); the film names 1024 px and shows the wider window.
- **Nothing on screen shows** that the landing page loads nothing from anywhere but Popkin
  (L2-061 AC2) or that the links to the sections are followed with Enter; the film says so on a
  card.
- It leaves out, though they are built and tested: the landing page's lead under "Better than a
  group chat." and "No app store detour. Works in the browser."; "Start a Popkin" in the
  navigation and in the closing band being followed; the welcome screen's "Start a Popkin" and
  "Sign in" being followed; and the landing page at 640 px.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/10-journey-10-discover-popkin
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/10-journey-10-discover-popkin
node tools/video-build/build.mjs docs/videos/10-journey-10-discover-popkin --crf 23
```
