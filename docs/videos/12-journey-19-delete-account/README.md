# 12 · Journey 19: Delete account

A person chooses "Delete my account" at the foot of their account. "Delete your account?" says
what is removed (their name, photo, phone number and direct messages) and what is kept without
their name (their messages and photos in Popkins), and names the active Popkins they host, which
wrap up. "Delete my account" stays disabled until "delete" is typed. Then "Deleting…", the session
ends and the landing page opens with "Your account is deleted". One card says what the tests
prove that no screen shows: the Worker erases the rest within 30 days.

- **Film:** [`12-journey-19-delete-account.mp4`](12-journey-19-delete-account.mp4), 1920×1080, 30 fps, 1 min 22 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M v1.0 (`af_heart`), run locally with `kokoro-onnx`. Hugging Face could not
  be reached from the machine that made it, so the same model was taken from the `kokoro-onnx`
  project's release of it (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) into `.cache/kokoro`.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier videos. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-049 (AC1 to AC4), L2-054 (personal data erased), L2-058 (AC4: a bottom sheet on a phone, a centred panel from 640 px).
- **Pictures:** every one is a screenshot of the running app from [`shots.ts`](shots.ts), with the
  API answered from the recording and the stubs of `e2e/` (ADR 0005); nothing ran against a backend.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The dialog on a phone, in the dark theme, over an aurora | Time to **go.** |
| 0:08 | 4 | `open` | The account on a phone; Sign out and Delete my account close up | Delete my **account.** |
| 0:16 | 8 | `what` | The dialog on a phone; "Removed", "Kept, without your name" and "You host 2 active Popkins" close up | What goes, **what stays.** |
| 0:32 | 5 | `confirm` | "Delete my account" disabled; "delete" typed and the button enabled; the dialog on a phone | One word **first.** |
| 0:42 | 6 | `done` | "Deleting…" on a phone; the landing page with the toast; the toast close up | Signed out, **for good.** |
| 0:54 | 4 | `grow` | The dialog as a sheet on a phone and as a panel in a browser window | A sheet, then **a panel.** |
| 1:02 | 6 | `erase` | The landing page in a browser window; two facts the tests prove | Erased in **30 days.** |
| 1:14 | 4 | `close` | The wordmark over the aurora |  |

## Make it again

```
node tools/video-record/record.mjs docs/videos/12-journey-19-delete-account
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/12-journey-19-delete-account
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/12-journey-19-delete-account
```
