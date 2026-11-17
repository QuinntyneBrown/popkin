# 23 · Journey 25: Keep close to people

A person keeps the people from their Popkins close with Contacts. Today leads with Grace's
birthday, what she is into and the last thing they talked about, beside what to do today and who
it has been a while since. Add someone, and only you can see them. Chidi's profile keeps how to
reach him, the habit with him and what he loves. A logged promise becomes a follow-up; memories
keep photos, files and notes. Dates, Follow-ups, Habits, Connections and Groups each get a
scene, and Import brings in everyone you share a Popkin with, telling nobody. One card says what
the tests prove that no screen shows: reminders come at 9 am where the person is, and nobody is
told they were added.

- **Film:** [`23-journey-25-keep-close-to-people.mp4`](23-journey-25-keep-close-to-people.mp4), 1920×1080, 30 fps, 2 min 18 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M v1.0 (`af_heart`), run locally with `kokoro-onnx` from `.cache/kokoro`.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier videos. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-125 (Today), L2-129 (add someone), L2-126 (People), L2-128 (profile), L2-133 (log),
  L2-136 (memories), L2-137 (dates), L2-141 (follow-ups), L2-143 (habits), L2-149 (connections),
  L2-146 (groups), L2-151 (import), L2-140 (reminders), L2-122 (privacy).
- **Pictures:** every one is a screenshot of the running app from [`shots.ts`](shots.ts), on the
  mocks' Tuesday, 15 September, with the API answered from the recording and the stubs of `e2e/`
  (ADR 0005); nothing ran against a backend.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | Today on a phone, in the dark theme, over an aurora | Keep people **close.** |
| 0:08 | 7 | `today` | Today in a browser window; the spotlight, To do today and It's been a while close up, in turn | What matters, **this morning.** |
| 0:22 | 5 | `add` | Add someone and People on phones | Only **you see them.** |
| 0:32 | 6 | `profile` | Chidi's profile on a phone; his habit close up | All of **Chidi.** |
| 0:44 | 5 | `log` | Log a conversation on a phone | A promise, **kept.** |
| 0:54 | 5 | `memories` | Memories & files in a browser window and on a phone | Keep the **moments.** |
| 1:04 | 6 | `dates` | Dates and Follow-ups on phones | Never **forget.** |
| 1:16 | 5 | `habits` | Habits on a phone; the overdue lunch close up | Keep the **rhythm.** |
| 1:26 | 6 | `connections` | The connection map in a browser window; Groups on a phone | Who knows **whom.** |
| 1:38 | 6 | `import` | Import from your Popkins on a phone; "They aren't told" and the Import button close up | Nobody is **told.** |
| 1:50 | 4 | `grow` | Today on a phone, a tablet and a browser window | Phone to **desktop.** |
| 1:58 | 6 | `proof` | A reminder on Today; two facts the tests prove | Quiet and **on time.** |
| 2:10 | 4 | `close` | The wordmark over the aurora |  |

## Make it again

```
node tools/video-record/record.mjs docs/videos/23-journey-25-keep-close-to-people
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/23-journey-25-keep-close-to-people
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/23-journey-25-keep-close-to-people
```
