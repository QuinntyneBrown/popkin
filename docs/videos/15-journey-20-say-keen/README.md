# 15 · Journey 20: Say keen

Some experiences are ideas for next time. On "Beach day next summer?", which Ellie shared as
"Want to do", the rating panel's place is taken by "Keen to do this?": four faces and "+3", "7
keen" and "I'm keen". Joel chooses it: the button is pressed, reads "You're keen", and the count
reads "8 keen"; choosing "You're keen" takes it back. Ellie, who shared it, or the Host chooses
"We did this", and it becomes "Something we did", ready to rate. Under "Want to do" in the list,
the card says "7 keen".

- **Film:** [`15-journey-20-say-keen.mp4`](15-journey-20-say-keen.mp4), 1920×1080, 30 fps,
  1 min 28 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally. Hugging Face could not be reached from the
  machine that built it, so the same Kokoro-82M v1.0 ONNX weights and the `af_heart` voice were
  taken from the `kokoro-onnx` project's GitHub release (`model-files-v1.0`) into
  `.cache/kokoro`, where `tools/video-audio` reads them.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 14. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-042 (AC1 to AC4: the keen panel and who is keen, "I'm keen" and
  "You're keen" with the count, "We did this" for the sharer or the Host), L2-037 (AC3: the
  card's keen count), L2-058 (the panel under the picture on a phone, beside it from 1024 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | The idea on a phone, in the dark theme, over an aurora | Say you’re **keen.** |
| 0:06 | 6 | `idea` | The idea on a phone; the keen panel close up | Keen to **do this?** |
| 0:18 | 5 | `press` | "I’m keen", then "You’re keen" close up; the count from 7 to 8; the phone after | Pressed, and **said.** |
| 0:28 | 4 | `undo` | The panel at 8 keen, then back at 7 | Changed your **mind?** |
| 0:36 | 7 | `done` | Ellie’s view with "We did this"; then "Something we did" and "How was it for you?" | We did **this.** |
| 0:50 | 3 | `list` | Experiences under "Want to do" in a browser window; the card close up | 7 **keen.** |
| 0:56 | 6 | `grow` | The idea growing from 390 to 768, 1024 and 1440 px | Under it, **then beside.** |
| 1:08 | 6 | `proof` | A card: what no screen shows and what is still to come | Keen **once.** |
| 1:20 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `done`, `grow` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: the states `experienceDetailWant` (Joel reading),
  `experienceDetailWantOwn` (Ellie, who shared it) and `experiencesWant` of
  `e2e/fixtures/experience-states.ts`. Every `/api` request was answered in memory by the
  fixtures (ADR 0005); no backend and no database ran.
- **The count does not change live for others.** The film shows Joel's own screen; another
  member sees the new count the next time they open the idea or the list. The card says so.
- **Nothing on screen shows** that saying it twice changes nothing and that anyone but the sharer
  or the Host is refused "We did this" (`403 not_experience_sharer`); the API tests prove both,
  and the film says so on a card.
- It leaves out, though they are built and tested: the failure toasts ("Your keen didn’t save",
  "That didn’t save"), the toggle from the keyboard, and the panel of a wrapped-up Popkin, which
  keeps who is keen and offers no button.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/15-journey-20-say-keen
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/15-journey-20-say-keen
node tools/video-build/build.mjs docs/videos/15-journey-20-say-keen
```
