# 16 · Journey 12: React and reply

Members react to a message and answer one message, in Everyone and in a direct message. Mara, in
the Everyone thread of Lakeside Weekend, presses and holds a message (or focuses it and presses
Enter): "Message actions" offers five quick reactions, "More reactions" with twelve more, "Reply"
and "Copy", and on her own message "Delete". A heart on Ruth's message shows as a chip, "Heart,
you reacted, 1", pressed; choosing it again takes it away. Dev's reaction arrives live. A
reaction that does not save goes back with "We couldn’t save your reaction." and "Try again";
Copy says "Message copied.". "Reply" shows "Replying to Ruth" with one line and "Cancel reply";
the reply carries a quote, and choosing a quote goes to the message and marks it. "Delete this
message?" asks first, and a reply to a deleted message quotes "Message deleted". The same works
in the direct message with Walt; in a wrapped-up Popkin the chips and quotes stay, and nothing
can be changed.

- **Film:** [`16-journey-12-react-and-reply.mp4`](16-journey-12-react-and-reply.mp4),
  1920×1080, 30 fps, 2 min 22 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, as the standard of
  [`docs/videos/README.md`](../README.md) asks; not edge-tts, which `tools/video-audio` does not
  speak with.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 15. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-024 (AC1: "Message actions" by press and hold or Enter, with five
  quick reactions, "More reactions", "Reply", "Copy" and, on the member's own message, "Delete";
  AC2: the chip with its count, pressed as the member's own; AC3: chosen again, it goes),
  L2-025 (AC1: "Replying to Ruth", one line and "Cancel reply"; AC2: the quote; AC3: choosing it
  goes to the message and marks it; AC4: "Message deleted"), L2-023 (AC3: the same in a direct
  message), L2-056 (the failed reaction's toast with "Try again"), L2-045 (read-only once
  wrapped up), L2-058 (Message actions at 390, 768, 1024 and 1440 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The Everyone thread on a phone, in the dark theme, over an aurora | Say it, **or answer it.** |
| 0:08 | 6 | `hold` | The thread, then Message actions on a phone; Walt's chips, then the five quick reactions close up | Hold, then **react.** |
| 0:20 | 7 | `react` | Ruth's message before, with the heart, and after it is taken back; the chip close up | Yours, **pressed.** |
| 0:34 | 5 | `live` | More reactions on a phone; its twelve and the pancakes on Dev's message; Dev's laugh arriving on Ruth's | Twelve more, **live.** |
| 0:44 | 5 | `toasts` | The failed reaction on a phone; its toast, then "Message copied." close up | Back, and **said.** |
| 0:54 | 6 | `reply` | "Replying to Ruth", then the sent reply with its quote | Answer **one.** |
| 1:06 | 5 | `quote` | Mara's quote of Ellie, then Ellie's message marked | Choose it, **go there.** |
| 1:16 | 6 | `delete` | Three phones: Delete on Mara's own message, "Delete this message?", "Message deleted" | Delete, **asked first.** |
| 1:28 | 5 | `dm` | The direct message with Walt; the laugh and the reply "Deal." close up | The same, **for two.** |
| 1:38 | 6 | `grow` | Message actions growing from 390 to 768, 1024 and 1440 px | From the bottom, **then over.** |
| 1:50 | 4 | `readonly` | The wrapped-up thread on a phone; Walt's chips and the closed composer close up | Kept, **not changed.** |
| 1:58 | 8 | `proof` | A card: what no screen shows | Once each, **in order.** |
| 2:14 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `reply`, `dm` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Message actions, More reactions, Delete, the reply bar,
  the deleted quote and the thread are opened by their keys in `e2e/fixtures/routes.ts`
  (`groupChat`, `reactions`, `reactionsMore`, `reactionsMine`, `deleteMessage`,
  `groupChatDeletedQuote`) with the states of `e2e/fixtures/react-states.ts`; the reactions, the
  failure, Copy, the quote and the read-only thread are Mara in the chat (`maraInTheChat`) and the
  direct message is Mara at home (`maraAtHome`), as in `e2e/tests/react-and-reply.spec.ts`. Every
  `/api` request was answered in memory by `e2e/fixtures/chat.ts` and `home.ts`, the hub by
  `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend and no database ran.
- **Every screen is Mara's.** Dev's laugh is pushed through the stubbed hub; that a reaction in
  a direct message reaches its two members alone is proved by
  `backend/tests/Popkin.Api.Tests/Chat/LiveReactionsTests.cs`.
- **The scenes are separate takes.** In `react` the phone after the heart is a new take of the
  thread, not the same press; in `delete` the three phones are three states, and the third is the
  thread after Ellie deleted her message, not after Mara deleted hers. The film says "a reply to
  it stays", which is that state.
- **"Loading earlier messages if it must"** is said, not shown: the quote on screen goes to a
  message already loaded. `e2e/tests/react-and-reply.spec.ts` proves the other case.
- **The marked message** was saved inside its two seconds; the film holds it longer.
- **The times under the reply and "Deal."** are the clock of the machine that took the shots:
  the chat fixture stamps a message Mara sends with the time it is sent.
- **Nothing on screen shows** that a member has one reaction per emoji on a message (the key of
  `MessageReactions`), that every change raises the message's `ReactionsVersion` so an older
  update never wins (`ReactionTests.cs`: `Every_change_raises_the_reactions_version_and_a_repeat_does_not`,
  `Two_reactions_at_the_same_moment_are_both_kept_with_their_own_versions`), that a direct
  message's reactions go to its two members alone (`LiveReactionsTests.cs`), or that no log
  carries the emoji (`Errors/UnexpectedErrorTests.cs`); the film says so on a card.
- **The register lags the branch.** Known gaps 64 and 70 of
  `docs/detailed-designs/README.md`, and the hub event in
  `docs/detailed-designs/chat/react-to-message/README.md`, still say reactions and replies in a
  direct message are not built and `ReactionsChanged` carries no version; the branch builds both.
  The film shows the branch.
- It leaves out, though they are built and tested: "Cancel reply", "Keep" in "Delete this
  message?", a deletion that fails, choosing someone else's chip to add to it, a second emoji
  beside the first, and closing Message actions with Escape. `shots.ts` also saves the direct
  message before Mara reacts, the heart chip of "Here’s the card she wrote it on", the deleted
  quote close up, and the panels of Message actions and of "Delete this message?", which the
  film does not use.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/16-journey-12-react-and-reply
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/16-journey-12-react-and-reply
node tools/video-build/build.mjs docs/videos/16-journey-12-react-and-reply --crf 23
```
