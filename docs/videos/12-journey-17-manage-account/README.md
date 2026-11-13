# 12 · Journey 17: Manage account

A signed-in person opens their account from their avatar on My Popkins. "Your account" shows
their photo, their name and the phone number they sign in with, which is read-only and never
shown to other members. A new name or photo is saved with "Save changes" and "Saved just now"
confirms it; an empty name saves nothing and is marked invalid. "Match my device", "Light" or
"Dark" is taken at once and remembered on the device. "Sign out" asks first, ends the session on
that device and opens the welcome screen.

- **Film:** [`12-journey-17-manage-account.mp4`](12-journey-17-manage-account.mp4), 1920×1080, 30 fps, 1 min 38 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M v1.0 (`af_heart`), run locally with `kokoro-onnx`. Hugging Face could not
  be reached from the machine that made it, so the same model was taken from the `kokoro-onnx`
  project's release of it (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) into `.cache/kokoro`.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier videos. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-048 (AC1 to AC5), L2-050 (AC3: a signed-out session stops at once), L2-059 (AC1: the theme), L2-058 (one centred column at every width).
- **Pictures:** every one is a screenshot of the running app from [`shots.ts`](shots.ts), with the
  API answered from the recording and the stubs of `e2e/` (ADR 0005); nothing ran against a backend.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The account on a phone, in the dark theme, over an aurora | Your **account.** |
| 0:08 | 8 | `account` | The avatar of My Popkins close up; the account on a phone; "Your name" and the read-only "Phone number" close up | All **yours.** |
| 0:24 | 6 | `save` | The account after a save; "Saved just now" close up | Saved **just now.** |
| 0:36 | 5 | `invalid` | The account with an empty name; "One thing to fix" and the marked field close up | Nothing **saved.** |
| 0:46 | 5 | `theme` | The theme close up, then in the dark; the account in light and dark | Light or **dark.** |
| 0:56 | 6 | `signout` | "Sign out of Popkin?" over the account; then the welcome screen | Asks **first.** |
| 1:08 | 5 | `grow` | The account growing from 390 to 768, 1024 and 1440 px | One column, **in the middle.** |
| 1:18 | 6 | `proof` | "Sign out of Popkin?" on a desktop; two facts the tests prove; what is still to come | Ended at **once.** |
| 1:30 | 4 | `close` | The wordmark over the aurora |  |

## Make it again

```
node tools/video-record/record.mjs docs/videos/12-journey-17-manage-account
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/12-journey-17-manage-account
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/12-journey-17-manage-account
```
