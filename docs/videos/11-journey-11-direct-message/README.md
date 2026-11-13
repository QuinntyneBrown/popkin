# 11 · Journey 11: Direct message

Two members of one Popkin talk privately. Mara opens the Chat tab of Lakeside Weekend
(`/p/:popkinId/chat`): Everyone first, in the Popkin's colour, with its latest message, its time
and three unread; then her direct messages under "Direct messages", the most recent first, Walt's
unread, bold with a dot. "New message" lists the Popkin's other members with a search that
ignores case and accents; choosing Walt opens the direct message with him
(`/p/:popkinId/chat/:memberId`): his avatar and name, "From 🏕️ Lakeside Weekend", and "Only you
two can see this". The two write to each other, live. From 1024 px the list sits beside the
thread, and from 1280 px a pane about Walt. "Call Walt" opens a call between the two only; when
one of them calls, the other sees "Call · 1 on the call" in the direct message, with Join, and
it is "Just the two of you". A wrapped-up Popkin's direct message is read-only.

- **Film:** [`11-journey-11-direct-message.mp4`](11-journey-11-direct-message.mp4), 1920×1080,
  30 fps, 2 min 12 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 10. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-022 (AC1 to AC4: Everyone first with its latest message, time and
  unread count; the direct messages under "Direct messages", the most recent first; the bold
  name and the dot named "Unread"; "New message" and its search), L2-023 (AC1: the other
  member's avatar and name, "From {emoji} {Popkin name}", "Only you two can see this"; AC2: the
  two writing, live; AC5: read-only once the Popkin has wrapped up), L2-030 (AC8: "Call Walt", a
  call between the two with the same controls), L2-058 (the direct message at 390, 768, 1024 and
  1440 px: the list beside the thread from 1024 px, the pane about the other member from
  1280 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The Chat tab on a phone, in the dark theme, over an aurora | Two of you. **Nobody else.** |
| 0:08 | 9 | `list` | The Chat tab on a phone; Everyone close up; then "Direct messages" and Walt's unread row | Everyone **first.** |
| 0:26 | 7 | `newmsg` | Four phones, one by one: New message with the other members, "tomas", "BREN", and Walt's direct message | Find **anyone.** |
| 0:40 | 5 | `dm` | The direct message on a phone; its header and "Only you two can see this" close up | Only you **two.** |
| 0:50 | 5 | `talk` | One phone: "Deal. See you at 8." typed, sent, then "Bring syrup?" arriving; both close up | Private, and **live.** |
| 1:00 | 10 | `grow` | The direct message growing from 390 to 768, 1024 and 1440 px; the pane about Walt close up | Wider, **side by side.** |
| 1:20 | 6 | `call` | "Call Walt" close up; the call on a phone, "Just you · 0:12", "Waiting for Walt"; its controls | Call **Walt.** |
| 1:32 | 6 | `answer` | A browser window: the direct message with "Call · 1 on the call" and Join, then the call of two; "Just the two of you · 12:48" and "Only you and Walt can join this call." close up | Just the **two of you.** |
| 1:44 | 4 | `readonly` | The direct message of a wrapped-up Popkin on a phone; its closed composer close up | Then, **read-only.** |
| 1:52 | 6 | `proof` | A card: what no screen shows and what is still to come | Nobody **else.** |
| 2:04 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `grow`, `call` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. The Chat tab, the direct message at every size and the
  read-only direct message are opened by their keys in `e2e/fixtures/routes.ts`
  (`conversations`, `directMessage`, `directMessageReadOnly`) with the states of
  `e2e/fixtures/direct-message-states.ts`; New message, the two talking and the calls are Mara
  in Lakeside Weekend (`maraAtHome`, `maraWithACall`). Every `/api` request was answered in
  memory by `e2e/fixtures/chat.ts`, `home.ts`, `call.ts` or the recording, the hub by
  `e2e/fixtures/hub.ts`, the microphone and camera by `e2e/fixtures/call-device.ts` and Walt's
  picture on the call by `e2e/fixtures/far-end.ts` (ADR 0005, ADR 0010, ADR 0014); Chromium ran
  with fake media. No backend, no database, no camera and no second machine ran. The pictures
  on the call are flat colours, not faces.
- **Every screen is Mara's.** "Bring syrup?" is Walt's message pushed through the stubbed hub;
  the banner "Call · 1 on the call" with Join is what Mara sees when Walt has started the call.
  The narration says "the other sees it", which is the same screen on whichever side did not
  call; that the two members see each other's call and that one joins the other's is proved by
  `backend/tests/Popkin.Api.Tests/Calls/DirectCallTests.cs` and `LiveDirectCallTests.cs`.
- **The scenes are separate takes.** In `newmsg` the fourth phone is the direct message Walt's
  name opened; the press is not on screen. In `call` the call is the one "Call Walt" opened;
  in `answer` the call of two is the one Join opened.
- **The times under "Deal. See you at 8."** are the clock of the machine that took the shots:
  the chat fixture stamps a message Mara sends with the time it is sent.
- **On a phone, the call banner sits above the thread,** which opens at its latest message:
  `shots.ts` scrolls the thread to its top before the shot, so the banner is in view. The film
  shows the banner on the desktop, where it stays under the header.
- **Nothing on screen shows** that a third member of the Popkin cannot read, post to or join any
  of it (`DirectMessageTests.cs`, `DirectCallTests.cs`: refused with 404); the film says so on
  a card. Reactions, replies (journey 12) and photos (journey 13) in a direct message are still
  to come, and the card says that too.
- It leaves out, though they are built and tested: the Chat tab with no direct messages, its
  loading and error states; New message's "Nobody by that name"; a direct message with nothing
  written yet ("Say hello to Walt."), its loading and error states; "Back"; the Chat tab beside
  the Everyone thread from 1024 px; and leaving the call back to the direct message. `shots.ts`
  also saves the Chat tab at 768, 1024 and 1440 px, the call at 768 px, the list pane and the
  call banner on a phone, which the film does not use.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/11-journey-11-direct-message
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/11-journey-11-direct-message
node tools/video-build/build.mjs docs/videos/11-journey-11-direct-message --crf 23
```
