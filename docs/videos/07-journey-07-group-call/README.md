# 07 · Journey 7: Group call

One tap puts the whole Popkin on a video call. "Group call" on the Popkin home, or "Start group
call" in the Everyone thread, opens the call: "Connecting…" and "Joining the call…", then a dark
stage under the Popkin's emoji and name, with a tile for everyone on it. A ring goes round whoever
is speaking, an avatar stands in for a camera that is off, and a muted microphone sits beside a
name. "Mute", "Camera" and "Leave" are under the tiles; "Minimise call" opens the home with the
call still running. Everyone else sees a banner with "Join". A refused microphone and camera are
explained.

- **Film:** [`07-journey-07-group-call.mp4`](07-journey-07-group-call.mp4), 1920×1080, 30 fps,
  2 min 16 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 06. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-029 (AC1 to AC6), L2-030 (AC1 for two and for six people, AC2 to
  AC7), L2-056 (joining), L2-058 (the tiles and the pane as the screen grows).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | Six on the call on a phone, over an aurora | The whole Popkin, **on a call.** |
| 0:08 | 4 | `start` | The Popkin home, then the Everyone thread; "Group call" and the top bar close up | One tap, **two places.** |
| 0:16 | 3 | `joining` | "Connecting…" and "Joining the call…" | First, **it gets ready.** |
| 0:22 | 6 | `alone` | The call on a tablet: "Just you · 0:12", the tile "You", "Waiting for the others", "Invite to call" | Just you, **for now.** |
| 0:34 | 8 | `six` | "6 on the call · 12:48"; the tiles of Walt (the ring), Ruth (the avatar) and Sam (the muted microphone) close up | Six on **the call.** |
| 0:50 | 7 | `grow` | The call growing from 390 to 640, 1024 and 1440 px; the pane "On the call" close up | Two across, **then three.** |
| 1:04 | 3 | `two` | Two people at 390 px and at 640 px | One above the other, **then side by side.** |
| 1:10 | 7 | `controls` | One phone: "Unmute", then "Camera off", then the Everyone thread after "Leave"; the controls and the tile "You" close up | Mute. Camera. **Leave.** |
| 1:24 | 4 | `minimise` | The call, then the home with "Group call · 6 on the call" and "Return" | Minimise. **Still on the call.** |
| 1:32 | 6 | `banner` | The banner with "Join" on the home (dark) and in the Everyone thread; a third phone where it appears, counts 1 then 2, and goes | A banner, **with Join.** |
| 1:44 | 6 | `refused` | "Not connected", "We can’t reach your camera or microphone", "Try again", "Back to the Popkin" | Refused? **It says how.** |
| 1:56 | 6 | `proof` | A card: what no screen shows and what is still to come | Browser **to browser.** |
| 2:08 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `six`, `controls`, `banner` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered by the call stub of
  `e2e/fixtures/call.ts`, the home's stub or the recording, and the hub by the stub of
  `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend and no hub ran.
- **The cameras' pictures are flat colours, not faces.** No camera and no microphone ran. The
  member's own is the stub of `e2e/fixtures/call-device.ts`: a dark green picture and a tone. The
  other people are `e2e/fixtures/far-end.ts`: each answers in the same page with a connection of
  its own, a brown picture and a tone, so sound and picture really flow between two connections,
  inside one browser. No second machine, no network between browsers and no media relay was
  reached; the film says nothing about call quality on real networks.
- The ring round Walt is the app hearing the far end's tone raised, not a voice.
- **The people are the mocks' six**: Walt, Ellie, Dev, Mara ("You"), Ruth with her camera off and
  Sam muted with the camera off, in Lakeside Weekend on the mocks' Saturday. The call's clock is
  held still, so a call under way reads "12:48"; "Just you · 0:12" is the same clock moved on
  twelve seconds.
- **"Waiting for the others" is shown on a tablet (768 px).** At 390 px the stage has no room
  for "Invite to call" under the message and the button is cut off under the controls; the film
  does not show that.
- "Connecting…" is the stub never answering the request for the microphone and camera; the
  refusal is the stub refusing. The browser's own question is never on screen.
- "Unmute" and "Camera off" are two takes, each from a fresh call, shown one after the other.
  After "Leave" the phone shows the Everyone thread, which that take came from, with the banner
  counting the five still on the call.
- The banner that appears, counts "1 on the call" then "2 on the call" and goes is Walt and Dev
  joining and leaving through the stubbed hub while the home is open on one phone. No two real
  devices were filmed.
- The pane "On the call" shows each microphone as an icon (green for whoever is speaking); the
  words for it are read to assistive technology and are not on screen.
- **Nothing on screen shows** that sound and picture go from browser to browser and never
  through Popkin's servers (ADR 0014); the film says so on a card.
- Not built, and not claimed: calling one person from a direct message (L2-030 AC8), named on
  the card as still to come.
- It leaves out, though they are built and tested: more than twelve on a call (eleven tiles and
  "4 more on the call"), three or four people, a call that cannot be joined ("We couldn’t connect
  you to the call"), "Try again" after a refusal, "Invite to call" opening the invite, someone
  else muting while the call runs, the member's own ring, and the not-found screen for someone
  who is not a member.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/07-journey-07-group-call
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/07-journey-07-group-call
node tools/video-build/build.mjs docs/videos/07-journey-07-group-call
```

`shots.ts` starts Chromium with `--autoplay-policy=no-user-gesture-required`, as
`e2e/playwright.config.ts` does: a call measures sound from the moment it opens.
