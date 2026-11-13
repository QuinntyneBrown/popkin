# 02 · Journey 2: Join by invite

A person opens an invite link, sees what they are joining, joins with a name and an optional
photo, and is welcomed. The invite grows from the phone to the desktop, where a picture sits
beside it.

- **Film:** [`02-journey-02-join-by-invite.mp4`](02-journey-02-join-by-invite.mp4), 1920×1080,
  30 fps, 2 min 14 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from video 01. 120 BPM; a bar is two seconds and
  every scene is a whole number of bars. The track is 116 seconds long, so it starts again, on a
  bar, at 1:56.
- **Requirements shown:** L2-012, L2-013, L2-014, L2-016, L2-053 AC3, L2-058 AC10, L2-059.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The invite on a phone, dark, over an aurora | Join by **invite.** |
| 0:08 | 5 | `invite` | The invite on a phone; the pill, the avatars and the time left close up | See what you’re **joining.** |
| 0:18 | 7 | `visitor` | The invite's preview close up, alone | Only **this.** |
| 0:32 | 4 | `grow` | The invite growing from 390 to 768, 1024 and 1440 px | One link, **every size.** |
| 0:40 | 4 | `signup` | Sign up on a phone, reached from Join; the code field close up | New here? **Six digits.** |
| 0:48 | 3 | `profile` | The profile step at 768 px | Name first. **Photo optional.** |
| 0:54 | 4 | `photo` | The photo picker close up, before and after; the profile step on a phone | Your initial, **or your face.** |
| 1:02 | 7 | `care` | A card: what happens to a photo; the refusal close up | Handled with **care.** |
| 1:16 | 5 | `welcome` | The welcome at 1024 px; the arrival close up; confetti | You’re **in!** |
| 1:26 | 4 | `wider` | The profile step at 1440 px and the welcome on a phone, dark | Wider screens show **who’s in.** |
| 1:34 | 5 | `cannot` | A wrapped-up invite and an invite that is not found, on two phones; the line close up | Some invites **are over.** |
| 1:44 | 5 | `proof` | A card: what the tests prove | Proven by **tests.** |
| 1:54 | 6 | `left` | A card: what is left for the owner, and the two buttons that lead to later journeys | Two choices, **still open.** |
| 2:06 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `grow`, `signup`, `welcome` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered from the recording or
  from a stub of `e2e/fixtures/journeys.ts` (ADR 0005); no backend ran. The fourteen people of
  Lakeside Weekend, their photographs and "Here until Sunday, 6 pm" are that stub's (`lakesideCast`,
  on the mocks' day): the recorded Popkin has three members.
- The lake beside the invite is a stock picture of the app, not a photo from the Popkin.
- The confetti in `welcome` is drawn by the film. The app's own burst is switched off in the
  screenshots, which are taken with reduced motion.
- The sign-up screen is the one journey 1 built, reached here by choosing Join as a visitor. The
  code field close up is from the code screen that follows it; the full code screen is not shown.
- The card "Handled with care" states what the backend does to a photo: it is checked by its bytes, turned upright, shrunk to at most 512 px, saved again as a JPEG
  and stripped of location and device data, and its address expires after an hour. No screen
  shows any of that. The refusal on the card is the app's own message for a file that is not a
  JPEG, PNG, WebP or HEIC.
- The card "Proven by tests" counts the tests on the day the film was built: 88 API tests,
  118 behaviour specs in Playwright and 344 component comparisons with the mocks
  (`npm run parity`). There are also 5 CLI tests and 39 unit tests of the `api` library, which
  the card leaves out.
- It does not show the chat, the note "popped in" or the toast other members get, the photo
  album, signing in to an existing account, or joining by typing or scanning a code: those are
  later journeys. "Say hi to everyone" and "See the photos" are buttons whose destinations are
  not built.
- Left for the owner: the photo store provider for a deployed system (in development photos are
  kept on local disk), and, as in journey 1, the SMS and email providers that send the code.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/02-journey-02-join-by-invite
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/02-journey-02-join-by-invite
node tools/video-build/build.mjs docs/videos/02-journey-02-join-by-invite
```
