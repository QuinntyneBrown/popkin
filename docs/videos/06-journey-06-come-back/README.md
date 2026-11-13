# 06 · Journey 6: Come back

A member who already has an account comes back. Sign in asks for a phone number or email and
sends a code; the code opens My Popkins, "Your Popkins": each active Popkin a card in its colour
with the latest message and its sender, faces with a count of the rest, the time left and a badge
for unread messages, and "Wrapped up" underneath. A message that arrives raises a badge and moves
its card first. Someone with no account is asked for a name after the code and sees "No Popkins
yet". "Scan to join" opens the camera. Loading, failure and offline are each explained.

- **Film:** [`06-journey-06-come-back.mp4`](06-journey-06-come-back.mp4), 1920×1080, 30 fps,
  2 min 22 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 05. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-006 (AC1, AC3, AC4; AC2 on screen and as a card), L2-007 (AC1 as a
  card), L2-015 (AC1 to AC4), L2-017 (AC1, AC2, AC4, AC6, AC7), L2-018 (AC1), L2-027 (AC3),
  L2-056 (AC1, AC2, AC4), L2-058 (the cards, "New Popkin" and the split screen as the screen
  grows).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | My Popkins on a phone, dark, over an aurora | Back to **your Popkins.** |
| 0:08 | 7 | `signin` | Sign in on a phone; the field and "Send my code" close up; "That email doesn’t look quite right."; the split screen at 1440 px | Welcome back. **One field.** |
| 0:22 | 3 | `code` | "Enter your code", then My Popkins | Six digits, **then your Popkins.** |
| 0:28 | 9 | `cards` | The three cards close up; "1 day 6 hrs left", "Ongoing", "Until Nov 30"; "Wrapped up" with "Recap" | Your Popkins, **at a glance.** |
| 0:46 | 4 | `live` | Thursday Night Group as "Running ten minutes late" arrives: a badge of 1, and first in the list | A new message **moves it first.** |
| 0:54 | 7 | `grow` | My Popkins growing from 390 to 640, 768 and 1024 px; "New Popkin" floating, then in the header | One across, **then three.** |
| 1:08 | 7 | `newcomer` | The code screen, "What should we call you?", then "No Popkins yet" | No account? **Just a name.** |
| 1:22 | 7 | `scan` | "Scan to join" three times: the frame, "That’s not a Popkin code", "Found it. Opening your invite…" | Scan to join, **with your camera.** |
| 1:36 | 4 | `denied` | "Popkin can’t use your camera", "Type the code instead" and "Try the camera again" | Camera refused? **It says how.** |
| 1:44 | 9 | `states` | One phone: the loading cards, "We couldn’t load your Popkins", the offline banner, "You’re offline" | Never left **guessing.** |
| 2:02 | 6 | `proof` | A card: what the tests prove and what is still to come | Proven by **tests.** |
| 2:14 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `cards`, `grow`, `newcomer`, `states`
and `proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered by the list stub of
  `e2e/fixtures/my-popkins.ts` or the recording, the hub by the stub of `e2e/fixtures/hub.ts`
  and the camera by the stub of `e2e/fixtures/camera.ts` (ADR 0005, ADR 0010); no backend, no
  hub and no camera ran, and no code was texted to anyone.
- **The list is the stub's:** the mocks' three active Popkins and two wrapped up, on the mocks'
  Saturday (12 September 2026), so Lakeside Weekend reads "1 day 6 hrs left".
- **The camera's picture is a blank canvas.** The stub answers the request for the camera and
  reads as a QR code whatever text the script holds up to it: `https://example.com/menu` for
  "That’s not a Popkin code", the recorded invite code for "Found it. Opening your invite…",
  which is held on screen by keeping the invite's screen from loading. The refused camera is the
  stub refusing. No real QR code was scanned.
- The code screen's wait reads "0:30" because the device's clock was set to the moment the
  recorded code was sent. After the code, the avatar shows initials: the recorded session has no
  photo, while the other shots give Mara the mocks' photograph.
- "Running ten minutes late" is pushed over the stubbed hub while My Popkins is open on one
  phone. No two real devices were filmed.
- The person with no account is the stub answering the code with "a name is required"; the name
  typed is Mara, and the session that follows is the recorded one.
- The offline banner is the browser told it is offline after the list had loaded. The offline
  screen was opened at `/offline` with the connection on; the film says only what the screen
  says, that a screen never loaded needs a connection. Opening the app from cold with no
  connection is not built and not claimed.
- **Nothing on screen shows** that asking for a code answers the same with or without an account
  (the API test `Asking_for_a_code_answers_and_works_the_same_with_or_without_an_account`), that
  a session lasts thirty days (`A_session_still_works_within_thirty_days`,
  `A_session_ends_after_thirty_days`) or that only the caller's Popkins are listed
  (`Only_the_callers_own_Popkins_are_listed`); the film says so on a card.
- Not built, and shown only as the labels that lead there: the Join with a code screen behind
  "Type the code instead", the recap behind a wrapped-up Popkin, and the account screen behind
  the avatar.
- It leaves out, though they are built and tested: a phone number a digit short, "Sending your
  code…", a code that could not be sent, too many codes, the screen asked for opening after
  sign-in, "99+", a card opening its Popkin's home, My Popkins with nothing wrapped up, a device
  with no camera, the list read again when the connection returns, and My Popkins at 1440 px
  (three across, as at 1024 px).

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/06-journey-06-come-back
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/06-journey-06-come-back
node tools/video-build/build.mjs docs/videos/06-journey-06-come-back
```
