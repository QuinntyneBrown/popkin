# 17 · Journey 13: Photos in chat

A member sends a photo in a thread, in Everyone and in a direct message. Mara, in the Everyone
thread of Lakeside Weekend, chooses "Photo" in the composer and picks one photo on the device; it
waits above the message field with "Remove photo", and she sends it with text and then without.
In the thread the photo is at most 16 rem wide at 4:3, with any text under it. A file over 10 MB
is refused with the reason ("This file is 14 MB. Photos can be up to 10 MB.") and "Dismiss", and
so is a file that is not a JPEG, PNG, WebP or HEIC photo. Walt's photo arrives live. Choosing
Dev's photo opens it full screen in the photo view, with its side panel from 1024 px; sent in
Everyone, it is in Photos under his name. In the direct message with Walt it works the same way
and stays between the two. A wrapped-up Popkin shows its photos, which still open, and offers no
Photo.

- **Film:** [`17-journey-13-photos-in-chat.mp4`](17-journey-13-photos-in-chat.mp4),
  1920×1080, 30 fps, 2 min 4 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, as the standard of
  [`docs/videos/README.md`](../README.md) asks; not edge-tts, which `tools/video-audio` does not
  speak with.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 16. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-026 (AC1: "Photo", the photo above the field with "Remove photo",
  sent with or without text; AC2: at most 16 rem wide at 4:3 with the text under it, and choosing
  it opens it full screen; AC3: in Photos under the sender's name, not from a direct message;
  AC4: the limits of L2-031), L2-031 (AC2: the refusal with its reason), L2-027 (AC1: a photo
  arrives as it is sent), L2-033 (the photo view and its side panel), L2-023 (AC3: photos in a
  direct message), L2-045 (read-only once wrapped up), L2-058 (the thread at 390, 768, 1024 and
  1440 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The Everyone thread with Dev's photo on a phone, in the dark theme, over an aurora | Show them, **in the thread.** |
| 0:08 | 6 | `choose` | The thread, then the photo picked, on a phone; the composer with Photo, then the photo above the field, close up | Pick one, **see it.** |
| 0:20 | 6 | `send` | The thread after Mara's photo; her photo with "Look at the lake" and one without text, close up | With words, **or without.** |
| 0:32 | 7 | `refused` | The refused file on a phone; "This file is 14 MB…" and "This isn't a JPEG, PNG, WebP or HEIC photo…" close up | Refused, **saying why.** |
| 0:46 | 5 | `live` | Walt's photo arrived on a phone, and close up | As it's **sent.** |
| 0:56 | 7 | `open` | Dev's photo full screen on a phone and in a browser window at 1440 px; "Dev Patel" in the side panel close up | Choose it, **full screen.** |
| 1:10 | 5 | `dm` | The direct message with Walt after "For you"; the photo close up | Just **you two.** |
| 1:20 | 6 | `grow` | The photo above the field, the thread growing from 390 to 768, 1024 and 1440 px | Phone to **desktop.** |
| 1:32 | 4 | `readonly` | The wrapped-up thread on a phone; Dev's photo and the closed composer close up | Kept, **still open.** |
| 1:40 | 8 | `proof` | A card: what no screen shows | Under **the hood.** |
| 1:56 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `open`, `grow` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. The photo above the field (at four sizes) and the refused
  file are opened by their keys in `e2e/fixtures/routes.ts` (`groupChatPhotoPreview`,
  `groupChatPhotoRefused`) with the states of `e2e/fixtures/chat-photo-states.ts`; the rest is Mara
  in the chat (`maraInTheChat`) or at home (`maraAtHome`), as in
  `e2e/tests/photos-in-chat.spec.ts`, with the page objects `ChatPhotos` and `PhotoViewPage`.
  Every `/api` request was answered in memory by `e2e/fixtures/chat.ts`, `home.ts` and
  `photos.ts`, the hub by `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend and no database
  ran.
- **Every screen is Mara's.** Walt's photo is pushed through the stubbed hub. The chat fixture
  answers every upload with the picture of the dock, so Mara picks that picture to send; the
  photo above the field in `grow` is the bonfire, the state the mock draws.
- **"In Photos under the sender's name"** is shown by the photo view of Dev's photo, which the
  album fixture holds under his name, as the behaviour spec does; the album page itself is not
  shown. That an Everyone photo joins the album and a direct message's never does is proved by
  `backend/tests/Popkin.Api.Tests/Chat/ChatPhotosInAlbumTests.cs`, and that only the two members
  open a direct message's photo by `DirectMessagePhotoPrivacyTests.cs`. The film says it; no
  screen shows a direct message's photo full screen.
- **"Or take one"** is said, not shown: the picker is the device's.
- **The times under Mara's photos** are the film's clock, set to the mocks' Saturday morning.
- **Nothing on screen shows** that location and device data are removed before a photo is stored
  and that its address is signed and expires (`UploadThreadPhotoTests.cs`:
  `A_member_uploads_a_photo_for_a_message_of_Everyone`; `Photos/PhotoViewTests.cs`:
  `A_photos_addresses_expire_and_cannot_be_guessed`), that the server checks the file's own
  bytes whatever its name says (`A_file_that_is_not_an_allowed_image_is_refused`), or that a
  photo message tried again does not upload its photo twice once it is up
  (`frontend/projects/api/src/lib/api/chat/message-outbox.spec.ts`: "is not uploaded again on a
  retry once it is up"); the film says so on a card.
- It leaves out, though they are built and tested: "Remove photo" pressed, Photo and Remove photo
  by the keyboard, and a photo the server refuses leaving its message "Not sent". `shots.ts` also
  saves the thread at 768, 1024 and 1440 px and the photo view at 768 and 1024 px, which the film
  does not use.
- **Found while taking the shots:** typing a message and pressing Enter in the same frame sends it
  but can leave its text in the field (seen with a photo, in Everyone and in a direct message, now
  and then). `shots.ts` waits a frame before Enter, so the film shows what a person sees; the
  behaviour is the composer's, not this film's, and is left for the owner.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/17-journey-13-photos-in-chat
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/17-journey-13-photos-in-chat
node tools/video-build/build.mjs docs/videos/17-journey-13-photos-in-chat --crf 23
```
