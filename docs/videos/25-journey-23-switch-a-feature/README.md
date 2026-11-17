# 25 · Journey 23: Switch a feature

An Owner switches Plan and Schedules in the admin app. Features shows each one, how far it
reaches and since when: Plan on in all 3,112 live Popkins, Schedules in 3 chosen Popkins. Lena
turns Schedules off; the dialog says the tab disappears within a minute and nothing is deleted,
and takes a reason for the audit log. Then Schedules is hidden in every Popkin. Everyone turns it
on for all; Chosen Popkins keeps it to the Popkins added by search, each removed with its cross.
A Support admin sees every switch switched off. One card says what the tests prove that no screen
shows: a change that fails changes nothing and keeps the reason to try again.

- **Film:** [`25-journey-23-switch-a-feature.mp4`](25-journey-23-switch-a-feature.mp4), 1920×1080, 30 fps, 1 min 42 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M v1.0 (`af_heart`), run locally with `kokoro-onnx` from `.cache/kokoro`.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier videos. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-076 (AC1 to AC8, AC12), L2-087 (AC5: a failed change keeps the reason).
- **Pictures:** every one is a screenshot of the running admin app on :4202 from
  [`shots.ts`](shots.ts), on the mocks' 14 July, with the API answered from the stubs of `e2e/`
  (ADR 0005); nothing ran against a backend.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | Features in the dark theme, over an aurora | Flip the **switch.** |
| 0:08 | 6 | `page` | Features in a browser window; Plan and Schedules close up | Who has **what.** |
| 0:20 | 6 | `off` | "Turn Schedules off for everyone?" with a reason | Nothing is **deleted.** |
| 0:32 | 5 | `done` | Schedules hidden in every Popkin; the toast | Hidden **everywhere.** |
| 0:42 | 5 | `everyone` | "Turn Schedules on for everyone?" | On for **all.** |
| 0:52 | 6 | `chosen` | Add a Popkin to Schedules; four chosen Popkins | Pick the **Popkins.** |
| 1:04 | 5 | `support` | Features as a Support admin, every switch off | Owners **only.** |
| 1:14 | 4 | `grow` | Features on a phone, a tablet and a browser window | Phone to **desktop.** |
| 1:22 | 6 | `proof` | Features on a phone; two facts the tests prove | Safe to **retry.** |
| 1:34 | 4 | `close` | The wordmark over the aurora |  |

## Make it again

```
node tools/video-record/record.mjs docs/videos/25-journey-23-switch-a-feature
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/25-journey-23-switch-a-feature
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/25-journey-23-switch-a-feature
```
