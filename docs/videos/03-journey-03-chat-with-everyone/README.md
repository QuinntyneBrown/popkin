# 03 · Journey 3: Chat with everyone

A member reads the Everyone thread of a Popkin, sends a message and sees one arrive live; a send
that fails is tried again, and messages written offline wait and are sent. The thread stands alone
on a phone, then the list of conversations and who is here now open beside it as the screen grows.

- **Film:** [`03-journey-03-chat-with-everyone.mp4`](03-journey-03-chat-with-everyone.mp4),
  1920×1080, 30 fps, 2 min 10 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 and 02. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-021 (AC1 to AC5, AC7), L2-027 (AC1, AC2, AC6), L2-028 (AC1 to AC3),
  L2-014 AC4, L2-019 AC7, L2-058 (AC8, AC11, AC12), L2-059.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The thread on a phone, dark, over an aurora | Chat with **everyone.** |
| 0:08 | 6 | `thread` | The thread on a phone; the top bar and the note "Joel popped in. Say hi! 👋" close up | One thread for **everyone.** |
| 0:20 | 4 | `bubbles` | Walt's message and Mara's own, close up, alone | Theirs left. **Yours right.** |
| 0:28 | 4 | `send` | The field with "Canoes leave at ten", then the message in the thread and the empty field | Press **Enter.** |
| 0:36 | 4 | `lines` | The field with two lines, and full at "2,000 / 2,000", close up | Shift+Enter, **a new line.** |
| 0:44 | 5 | `live` | The thread before and after "Kettle is on" arrives; the message close up; what is announced | Live, **without reloading.** |
| 0:54 | 4 | `newer` | A longer thread read from its top with "New messages", then at its latest | The view **stays put.** |
| 1:02 | 6 | `failed` | "You’re on the list, Ruth!" marked "Not sent" with "Try again" and "Delete", then sent | Never lost **silently.** |
| 1:14 | 6 | `offline` | The offline banner, two messages "Waiting to send", then "Back online. 2 messages sent." | Offline? **It waits.** |
| 1:26 | 9 | `grow` | The thread growing from 390 to 768, 1024 and 1440 px | One thread, **every size.** |
| 1:44 | 4 | `panes` | The thread at 1440 px, light then dark; the list and "Here now" close up | The list, the thread, **who’s here.** |
| 1:52 | 5 | `proof` | A card: what the tests prove | Proven by **tests.** |
| 2:02 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `send`, `live`, `failed`, `grow` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered by the chat stub of
  `e2e/fixtures/chat.ts` or the recording, and the hub by the stub of `e2e/fixtures/hub.ts`
  (ADR 0005, ADR 0010); no backend and no hub ran. The fourteen members of Lakeside Weekend, the
  five here now and the thread are that stub's, on the mocks' day (Saturday 12 September 2026,
  noon on the device): the recorded Popkin has four members and one message.
- "Kettle is on" and "Anyone seen the paddles?" are pushed over the stubbed hub, as the server
  sends a message to a thread. "Within a second" is L2-027 AC1; the behaviour spec holds the app
  to it against the stub, and the API test `A_message_reaches_the_other_members_as_it_is_sent`
  proves the server sends it. No two real devices were filmed.
- The card "Announced politely" quotes what the app puts in its polite live region for that
  message ("Walt: Kettle is on"); a region for assistive technology has no picture.
- The failed send is the stub answering 500 until it is told to stop; offline is the browser
  taken offline. `shots.ts` stores what Mara sends a minute after noon on the mocks' day, where
  the stub would stamp it with the clock of the machine taking the pictures; nothing else about
  sending is changed.
- The longer thread of `newer` is fourteen more messages written for the film with the fixture's
  own `message` helper, so the thread is taller than a phone.
- In `offline` the banner sits at the top of the page and the waiting messages at its end, so the
  phone shows first one and then the other; a 390 px window does not hold both.
- The card "Proven by tests" counts the behaviour specs of `e2e/tests/group-chat.spec.ts` on the
  day the film was built: 38. Its three lines are the API tests
  `Sending_the_same_client_message_id_again_returns_the_stored_message` and
  `Only_a_member_reads_the_thread`, and the behaviour spec "catches up on what it missed after the
  connection drops".
- It does not show reactions, replies, photos in chat, the group call, direct messages, the list
  of conversations as its own screen, unread counts on the Popkin home or My Popkins, or the
  read-only thread of a wrapped-up Popkin: those are later journeys. On a phone, Back leads to
  Chat, which for now opens this thread again; the tabs Home, Photos and Experiences lead to
  screens that are not built. The list beside the thread from 1024 px holds the Everyone thread
  only.
- It leaves out, though they are built and tested: the empty thread and its three openers
  (L2-021 AC8), loading earlier messages in pages of 50 (L2-027 AC5), the unread count on the
  Chat tab (L2-027 AC3, AC4), "Delete" on a failed message, the text kept in the field
  (L2-028 AC4), "Slow down a little" (L2-053) and the toast when someone pops in.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/03-journey-03-chat-with-everyone
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/03-journey-03-chat-with-everyone
node tools/video-build/build.mjs docs/videos/03-journey-03-chat-with-everyone
```
