# 19 · Meet Popkin

The pitch. Where every other film walks through one journey, this one is written to make someone
want to use Popkin: the moment a group forms, the group chat that follows, and what Popkin does
instead, from the QR code to the recap. It is the film to put in front of someone who has never
heard of Popkin.

- **Film:** [`19-meet-popkin.mp4`](19-meet-popkin.mp4), 1920×1080, 30 fps, 1 min 38 s. Captions:
  [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, as in every Popkin film.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the earlier films. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Tone:** a pitch, so it speaks to the viewer's want rather than naming screens and
  requirements; it has no kicker with a requirement number and no "what the tests prove" card.
  Every claim is still one the branch makes good, in the app's own words: "Scan. Join. You’re
  in.", "Free, no app to download.", "One tap, whole group", "A proper send-off and recap",
  "Free. Like, actually free." and "Your people, popped up in seconds." are copy from the landing
  page and the invite.

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The landing page on a phone, in the dark theme, over the aurora | We should all **get together.** |
| 0:08 | 4 | `problem` | The landing page's comparison of a group chat and Popkin, close up | Not another **group chat.** |
| 0:16 | 4 | `meet` | "Pop! Lakeside Weekend is up." with its QR code, and the Popkin home, on two phones | Meet **Popkin.** |
| 0:24 | 5 | `invite` | The QR code close up; the invite, "Mara invited you", and "Welcome in, Joel!" on two phones | Scan. Join. **You’re in.** |
| 0:34 | 4 | `chat` | The Everyone thread with reactions; a reply's quote close up; the direct message with Walt | Talk it **out.** |
| 0:42 | 4 | `photos` | The album on a desktop, by day | One shared **album.** |
| 0:50 | 4 | `call` | The group call with six on a desktop and on a phone | One tap, **whole group.** |
| 0:58 | 5 | `rate` | An idea with "Keen to do this?"; "You’re keen" and the group's 4.7 close up; the experience's page | Rate the **moments.** |
| 1:08 | 5 | `wrap` | The recap, "This Popkin wrapped up. What a time."; its numbers and the top-rated moment close up; confetti | A proper **send-off.** |
| 1:18 | 5 | `free` | The landing page growing from a phone to a desktop | Like, actually **free.** |
| 1:28 | 5 | `close` | The name over the aurora | Your people, **popped up in seconds.** |

A wipe in a Popkin colour marks each change of act (into `meet`, `chat`, `wrap` and `close`);
inside an act the cuts are hard.

## Where the pictures come from

Every picture is a screenshot of the running app, taken by the `shots.ts` of an earlier film with
the fixtures and page objects of `e2e/`; every `/api` request was answered in memory (ADR 0005)
and no backend and no database ran. This film takes no screenshots of its own and has no
`shots.ts`: `film.js` reads the pictures from the folders that saved them, so a film that
re-records its shots changes this one too.

| Film | Pictures |
|---|---|
| [01](../01-journey-01-start-a-popkin/README.md) Start a Popkin | `created-xs` |
| [02](../02-journey-02-join-by-invite/README.md) Join by invite | `invite-xs`, `welcome-xs` |
| [04](../04-journey-04-popkin-home/README.md) Popkin home | `home-xs`, `invite-qr` |
| [05](../05-journey-05-share-photos/README.md) Share photos | `album-xl` |
| [07](../07-journey-07-group-call/README.md) Group call | `call-six-xl`, `call-six-xs` |
| [08](../08-journey-08-rate-an-experience/README.md) Rate an experience | `detail-xs`, `score` |
| [09](../09-journey-09-wrap-up/README.md) Wrap up | `recap-xs`, `recap-stats`, `recap-moment` |
| [10](../10-journey-10-discover-popkin/README.md) Discover Popkin | `landing-xs-dark`, `compare-table`, `landing-xs`, `landing-m`, `landing-l`, `landing-xl` |
| [14](../11-journey-11-direct-message/README.md) Direct message | `dm-xs` |
| [15](../15-journey-20-say-keen/README.md) Say keen | `want-xs`, `panel-keen` |
| [16](../16-journey-12-react-and-reply/README.md) React and reply | `hearted-xs`, `mara-quote` |

## What it says, and what it leaves out

- **"Popped up in seconds" and "takes about a minute"** are the landing page's promises; the film
  does not time a sign-up.
- **"The album to keep"** is "Keep the photo album" in the Host's wrap-up and "Save the album" on
  the recap, which prepares a zip; the film shows neither press.
- **The call shows no faces.** Its screenshots were taken in a browser without a camera, so the
  video tiles are plain; the film says "the whole group is on a call" and does not claim a picture.
- It leaves out, though they are built: photos in chat, the Popkin's settings, coming back to My
  Popkins, leaving a Popkin and the account.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/19-meet-popkin
node tools/video-build/build.mjs docs/videos/19-meet-popkin --crf 23
```
