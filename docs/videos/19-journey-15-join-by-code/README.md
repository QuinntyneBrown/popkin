# 19 · Journey 15: Join by code

Not every invite arrives as a tapped link. A friend may read out the code. On the welcome screen,
"Join with a code" opens "Got a code?", and "Scan a QR code instead" is one tap away. The code
typed opens the invite to Lakeside Weekend, after "Finding your Popkin…"; a code no Popkin has
marks the field "We can’t find a Popkin with that code." and keeps what was typed. Too many tries
say "That’s a lot of tries." with "Try again in 9 minutes.", and a lookup that fails says "We
couldn’t look that up." with what was typed still there.

- **Film:** [`19-journey-15-join-by-code.mp4`](19-journey-15-join-by-code.mp4), 1920×1080,
  30 fps, 1 min 20 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, from the same weights in `.cache/kokoro` as
  videos 01 to 18.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 18. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-015 (AC5: the code typed or the link pasted opens the invite; AC6:
  no match marks the field and keeps the text), L2-053 (AC3, AC4: too many tries and when to try
  again), L2-056 (AC3: "Finding your Popkin…"), L2-058 (AC10: one column on a phone, the picture
  beside it from 768 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | "Got a code?" on a phone, in the dark theme, over an aurora | Got a **code?** |
| 0:06 | 5 | `reach` | The welcome screen, then "Got a code?", then Scan to join; the welcome's two actions close up | No camera **needed.** |
| 0:16 | 7 | `type` | The code typed, "Finding your Popkin…", then the invite to Lakeside Weekend | Type it, **or paste it.** |
| 0:30 | 3 | `invalid` | The field marked "We can’t find a Popkin with that code." | Kept as **typed.** |
| 0:36 | 5 | `limited` | "That’s a lot of tries.", then "We couldn’t look that up." | Then **a wait.** |
| 0:46 | 6 | `grow` | "Got a code?" growing from 390 to 768, 1024 and 1440 px | One column, **then the fire.** |
| 0:58 | 7 | `proof` | A card: what no screen shows and what is still to come | Hard to **guess.** |
| 1:12 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `type`, `grow` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: a visitor at `/join` with `aVisitorWithACode`, the lookup
  held, refused or failing by `holdTheLookup`, `tooManyTries` and `theLookupFails`
  (`e2e/fixtures/join-code.ts`). Every `/api` request was answered in memory by the fixtures
  (ADR 0005); no backend and no database ran.
- **Nothing on screen shows** the limit itself, 20 lookups in 10 minutes from one address
  (`invite-codes`), or that nothing is sent for an empty field or for a link that is not
  Popkin's. The API tests, the unit tests of `JoinCode` and the behaviour specs prove them, and the
  film says so on a card.
- It leaves out, though it is built and tested: the empty field marked "Type the code or paste the
  link from your invite.", and "Type the code instead" in Scan to join.
- **Still to come:** a link on a Popkin's own address, found by its address (L2-065 AC4, AC6);
  Popkin has no address yet.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/19-journey-15-join-by-code
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/19-journey-15-join-by-code
node tools/video-build/build.mjs docs/videos/19-journey-15-join-by-code
```
