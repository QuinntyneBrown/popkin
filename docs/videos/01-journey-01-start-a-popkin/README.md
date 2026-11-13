# 01 · Journey 1: Start a Popkin

A person signs up with a code, names a Popkin while the preview follows every choice, chooses how
long it lasts and gets the QR code. The split screens grow from the phone to the desktop.

- **Film:** [`01-journey-01-start-a-popkin.mp4`](01-journey-01-start-a-popkin.mp4), 1920×1080,
  30 fps, 1 min 48 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)). 120 BPM; a bar is two seconds and every scene is a
  whole number of bars.
- **Requirements shown:** L2-003, L2-004, L2-007, L2-008, L2-009, L2-010, L2-011 AC6, L2-058
  AC3 and AC10, L2-059.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The created screen on a phone, dark, over an aurora | Start a **Popkin.** |
| 0:08 | 5 | `signup` | Sign up on a phone | Just your **name.** |
| 0:18 | 5 | `code` | The code screen on a phone, the code field close up | Six digits, **you’re in.** |
| 0:28 | 5 | `grow` | Sign up growing from 390 to 768, 1024 and 1440 px | One screen, **every size.** |
| 0:38 | 6 | `name` | Name your Popkin at 1440 px; the preview card close up, three times | Name it. **See it.** |
| 0:50 | 5 | `length` | How long at 768 px; the timeline close up, twice | It lasts as long **as you say.** |
| 1:00 | 6 | `created` | The created screen at 1440 px; the QR card close up | Pop! **It’s up.** |
| 1:12 | 4 | `themes` | The created screen, light at 1440 px and dark on a phone | Light or dark, **phone or desk.** |
| 1:20 | 5 | `proof` | A card: what the tests prove | Proven by **tests.** |
| 1:30 | 5 | `left` | A card: what is left for the owner | Who sends **the code?** |
| 1:40 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `grow`, `name`, `created` and `proof`);
inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered from the recording
  (ADR 0005); no backend ran. The invite link on the QR card is the recorded one.
- The card "Proven by tests" states what the backend tests prove (codes are stored hashed, expire
  after 10 minutes and work once) and counts the 244 component comparisons `npm run parity` made
  on the day the film was built.
- The avatar on the preview card shows initials: no screen sets a photograph yet.
- It does not show the sign-in screen, joining through the invite link or the Popkin home: those
  are later journeys.
- Left for the owner: the SMS and email providers. Until they are chosen, the code is written to
  the log, not sent.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/01-journey-01-start-a-popkin
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/01-journey-01-start-a-popkin
node tools/video-build/build.mjs docs/videos/01-journey-01-start-a-popkin
```
