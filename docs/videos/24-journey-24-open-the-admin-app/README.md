# 24 · Journey 24: Open the admin app

Staff open the admin app. Lena Fischer opens the audit log and is asked to sign in: her staff
email, then a code sent to it that works for 10 minutes, and the page she asked for opens. The
audit log lists every action taken in the console, newest first, with who did it, kept for 2
years and editable by nobody. An Owner sees Admins & roles, adds an admin who is invited until
they sign in, changes a role with a reason for the log, and reads what each role can do. One card
says what the tests prove that no screen shows: a right code that is not an admin's is turned
away, and the console always keeps one Owner.

- **Film:** [`24-journey-24-open-the-admin-app.mp4`](24-journey-24-open-the-admin-app.mp4), 1920×1080, 30 fps, 1 min 54 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M v1.0 (`af_heart`), run locally with `kokoro-onnx` from `.cache/kokoro`.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier videos. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-088 (sign in with a code), L2-089 (the console's frame), L2-119
  (admins and roles), L2-120 (audit log).
- **Pictures:** every one is a screenshot of the running admin app on :4202 from
  [`shots.ts`](shots.ts), with the API answered from the recording and the stubs of `e2e/`
  (ADR 0005); nothing ran against a backend. The recorder starts the admin app as the e2e suite
  does, since this film.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The audit log in the dark theme, over an aurora | The **console.** |
| 0:08 | 5 | `signin` | Sign in to the console on a phone, the staff email typed | Staff **email first.** |
| 0:18 | 5 | `code` | Enter your code on a phone; "Sent to … It works for 10 minutes." close up | A code, **10 minutes.** |
| 0:28 | 7 | `audit` | The audit log in a browser window; its newest row and Lena, Owner, close up | Every action, **kept.** |
| 0:42 | 5 | `admins` | Admins & roles in a browser window and on a phone | Who can **sign in.** |
| 0:52 | 6 | `add` | Add admin, then Priya R invited | Invited **by code.** |
| 1:04 | 6 | `role` | "Make Aiko Tanaka a Viewer?" with a reason | With a **reason.** |
| 1:16 | 5 | `roles` | What each role can do | Owner, Support, **Viewer.** |
| 1:26 | 4 | `grow` | The audit log on a phone, a tablet and a browser window | Phone to **desktop.** |
| 1:34 | 6 | `proof` | The audit log after signing in; two facts the tests prove | Admins **only.** |
| 1:46 | 4 | `close` | The wordmark over the aurora |  |

## Make it again

```
node tools/video-record/record.mjs docs/videos/24-journey-24-open-the-admin-app
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/24-journey-24-open-the-admin-app
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/24-journey-24-open-the-admin-app
```
