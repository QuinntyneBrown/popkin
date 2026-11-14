# 20 · Journey 14: Engage with a photo

A member reacts to a photo, comments on it, saves it and deletes it. Mara opens the dock photo of
Lakeside Weekend in the photo view. Five quick reactions and "More reactions" sit under it; the
heart takes the count from 9 to 10, pressed, and a second tap takes it back; More reactions gives a
party popper. A reaction that cannot be saved puts the count back with "We couldn’t save your
reaction.". On a phone, Comment opens the Photo comments dialog, oldest first; a comment added
makes "3 comments" "4 comments", a count shows near the 500-character limit ("452 / 500"), and a
photo with none says "No comments yet". Mara's own comment has Delete, after "Delete this
comment?". From 1024 px the same comments sit in the side panel beside the photo, with the field
under them. "Save photo" downloads the photo at the size it was added, without location or device
data. Photo actions, then "Delete this photo?", returns Mara to Photos with "Photo deleted."; in
chat its message reads "Photo removed", and someone looking at it sees "This photo was removed".
A wrapped-up Popkin keeps the reactions and comments, to read.

- **Film:** [`20-journey-14-engage-with-a-photo.mp4`](20-journey-14-engage-with-a-photo.mp4),
  1920×1080, 30 fps, 2 min 28 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, from the same weights in `.cache/kokoro` as
  videos 01 to 19.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 19. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-034 (AC1: five quick reactions and "More reactions"; AC2: the count
  up by one, pressed; AC3: taken back; AC4: the count put back and a message), L2-035 (AC1: the
  dialog, oldest first, each with avatar, first name and time; AC2: the count up by one; AC3: 500
  characters and a count; AC4: the first comment invited; AC5: one's own deleted after confirming),
  L2-036 (AC1: Save photo; AC2: deleted after confirming, by the uploader or the Host; AC3:
  "Photo removed" in chat), L2-045 (read-only once wrapped up), L2-058 (AC11: the side panel from
  1024 px in place of the dialog).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | The photo view on a phone over an aurora | Worth **a heart?** |
| 0:06 | 6 | `react` | The photo view, then the heart pressed; the react bar and "10" close up | Five, and **more.** |
| 0:18 | 4 | `back` | "9" close up; More reactions, then the party popper given | Taken **back.** |
| 0:26 | 4 | `failed` | "We couldn’t save your reaction." on a phone and close up | Put **back.** |
| 0:34 | 6 | `comments` | The Photo comments dialog, 3 comments, then 4 | On a phone, **a dialog.** |
| 0:46 | 5 | `limit` | The field at "452 / 500" close up; "No comments yet" on a phone | Say it **in 500.** |
| 0:56 | 4 | `own` | Mara's comment with Delete close up; "Delete this comment?" | Delete, **once sure.** |
| 1:04 | 6 | `panel` | The photo view at 1440 px in a browser window; the side panel close up | Same comments, **two places.** |
| 1:16 | 4 | `save` | The bar with Save photo close up; two cards | Keep it, **full size.** |
| 1:24 | 7 | `delete` | Photo actions, "Delete this photo?", then Photos with "Photo deleted." | Yours, **or the Host’s.** |
| 1:38 | 5 | `removed` | "Photo removed" in chat close up; "This photo was removed" on a phone | Photo **removed.** |
| 1:48 | 6 | `grow` | The photo view growing from 390 to 768, 1024 and 1440 px | Phone to **desktop.** |
| 2:00 | 4 | `readonly` | The wrapped-up photo view at 1440 px | Kept, **to read.** |
| 2:08 | 6 | `proof` | A card: what no screen shows | Nothing **left behind.** |
| 2:20 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `comments`, `save` and `grow`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: Mara on the dock photo (`maraOnTheDock`,
  `e2e/fixtures/photo-talk.ts`), with the page objects `PhotoTalkPage` and `PhotoViewPage`, as in
  `e2e/tests/engage-with-a-photo.spec.ts`; the chat is `maraInTheChat` with a message whose photo
  was removed. Every `/api` request was answered in memory by `e2e/fixtures/photo-talk.ts`,
  `photos.ts` and `chat.ts`, the hub by `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend
  and no database ran.
- **Every screen is Mara's.** The deletion seen while the photo is open is pushed through the
  stubbed hub (`deletedBySomeone`). Mara added the dock photo, so Photo actions are theirs; that
  the Host may delete any album photo is said, not shown, and proved by
  `backend/tests/Popkin.Api.Tests/Photos/DeletePhotoTests.cs`
  (`The_Host_deletes_any_album_photo_and_another_member_none`).
- **Save photo** is shown by its button: `shots.ts` waits for the download
  (`popkin-photo-20260912-0658.jpg`), but a download has no screen. The original size and the
  missing location and device data are proved by `SavePhotoTests.cs`
  (`A_member_saves_the_photo_as_it_was_added`).
- **Nothing on screen shows** that a deleted photo leaves nothing behind
  (`The_uploader_deletes_their_photo_and_nothing_of_it_is_left`), that only its author deletes a
  comment (`PhotoCommentTests.cs`: `Only_its_author_deletes_a_comment`) or that a comment's text
  is never logged (`The_text_of_a_comment_is_never_logged`); the film says so on a card.
- It leaves out, though they are built and tested: reacting by the keyboard, a save or a deletion
  that fails, a comment that cannot be posted, and the photo view of a member who may not delete
  the photo. `shots.ts` also saves screens the film does not use.
- **The times** are the film's clock, set to the mocks' Saturday morning.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/20-journey-14-engage-with-a-photo
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/20-journey-14-engage-with-a-photo
node tools/video-build/build.mjs docs/videos/20-journey-14-engage-with-a-photo --crf 23
```
