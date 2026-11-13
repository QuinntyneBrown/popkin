# 05 · Journey 5: Share photos

A member opens Photos, the Popkin's shared album: how many photos from how many people, grouped by
day, with Everyone and Mine. "Add" takes up to 20 photos with a caption each; a file over 10 MB is
marked and left out, a progress bar shows the upload, and a photo that failed stays with "Try
again". New photos appear without a reload. A photo opens full screen on a dark background. The
grid goes from three across on a phone to six, and the photo gains a panel beside it.

- **Film:** [`05-journey-05-share-photos.mp4`](05-journey-05-share-photos.mp4), 1920×1080, 30 fps,
  2 min 16 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 04. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-031 (AC1, AC2, AC4, AC5, AC7; AC6 as a card), L2-032 (AC1 to AC5),
  L2-033 (AC1 to AC3), L2-058 (the grid, "Add" and the photo's panel as the screen grows).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The album on a phone, dark, over an aurora | One album, **everyone’s photos.** |
| 0:08 | 7 | `album` | The album on a phone; "48 photos from 11 people" and the first day's grid close up | Everyone’s photos, **by day.** |
| 0:22 | 6 | `filters` | Everyone, then Mine pressed with one photo, then "No photos yet" with "Add photos" | Everyone’s, **or yours.** |
| 0:34 | 5 | `add` | "Add photos" centred at 1440 px and as a sheet on a phone; a caption, "Dock at dawn"; "Add 3 photos" | Up to twenty, **a caption each.** |
| 0:44 | 4 | `limits` | "This file is 14 MB. Photos can be up to 10 MB." and "Add 2 photos" | Too large? **It says why.** |
| 0:52 | 6 | `upload` | "Uploading 1 of 3" and "Adding…"; then "One photo didn’t upload. The other two are in the album." with "Try again" | How far, **and what failed.** |
| 1:04 | 4 | `live` | The album as "Canoe race" arrives: 48 photos, then 49 | New photos, **no reload.** |
| 1:12 | 8 | `view` | A photo full screen on a phone: who added it and when, the caption; the next two photos | The whole photo, **full screen.** |
| 1:28 | 9 | `grow` | The album growing from 390 to 768, 1024 and 1440 px; "Add" floating, then "Add photos" in the header | Three across, **then six.** |
| 1:46 | 4 | `panel` | The photo on a phone, then at 1440 px with its panel, close up | A panel, **beside the photo.** |
| 1:54 | 7 | `proof` | A card: what the tests prove, what is still to come, what the owner must supply | Proven by **tests.** |
| 2:08 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `filters`, `add`, `upload`, `view`,
`grow` and `proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered by the album stub of
  `e2e/fixtures/photos.ts`, the home stub or the recording, and the hub by the stub of
  `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend, no hub and no photo store ran.
- **The album is the stub's.** It draws 18 photos, the mocks' pictures, and says "48 photos from 11
  people" as the mock does. The photos that are "added" are the stub storing a name and a caption;
  no file was uploaded anywhere.
- **Nothing on screen shows that location and device data are removed** (L2-031 AC6). That is the
  API test `Stored_files_carry_no_location_or_device_data`; the film says so on a card. The other
  two lines of the card are the API test `Only_a_member_reads_the_album` and the behaviour spec
  "opens with the latest 60 and loads more as the member scrolls".
- "Uploading 1 of 3" with "Adding…" is the stub holding every upload; the failed photo is the stub
  answering 500 for one file. "Try again" is shown, not pressed.
- "Canoe race" is pushed over the stubbed hub while the album is open on one phone, as the server
  tells a Popkin of new photos. No two real devices were filmed.
- The arrow key and the swipe were made in the browser that took the pictures, and each opened
  the next photo. Close and Escape returning to the place left (L2-033 AC2) is said and shown as
  labels only; the behaviour specs prove it.
- The clock of the pictures is the mocks' Saturday (12 September 2026) at twenty to noon on the
  device, so the sidebar reads "1 day 6 hrs left" in every shot.
- Reactions, comments, saving and deleting (journey 14) are not built: a photo shows none. Photos
  from chat (journey 13) and the read-only album after wrap-up (journey 9) are not built either.
  A deployed system still needs a photo store provider (the register of gaps in
  `docs/detailed-designs/README.md`).
- It leaves out, though they are built and tested: the loading skeletons, "We couldn’t load the
  photos", Mine with none, a file that is not a photo, the limit of 20 said in the dialog, the
  count at 200 characters, "This Popkin has wrapped up", "This photo didn’t load", and the album
  loading more as it scrolls.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/05-journey-05-share-photos
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/05-journey-05-share-photos
node tools/video-build/build.mjs docs/videos/05-journey-05-share-photos
```
