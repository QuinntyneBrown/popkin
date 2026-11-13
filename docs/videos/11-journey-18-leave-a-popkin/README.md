# 11 · Journey 18: Leave a Popkin

A member who no longer wants a Popkin leaves it. Mara, a member of Lakeside Weekend who is not
its Host, opens Popkin settings: "Invite people" and "Leave this Popkin", with "You can come back
with a new invite". "Leave Lakeside Weekend?" says "Your messages and photos stay. To come back
you’ll need a new invite.", with "Leave" and "Stay". "Leave" reads "Leaving…" while it goes
through; then My Popkins opens without Lakeside Weekend. The Host, still in it, sees "13
members" where it said "14 members", without a reload.

- **Film:** [`11-journey-18-leave-a-popkin.mp4`](11-journey-18-leave-a-popkin.mp4), 1920×1080,
  30 fps, 1 min 22 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 10. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-020 (AC2: a member’s menu is "Invite people" and "Leave this
  Popkin" only), L2-047 (AC1: the dialog; AC2: My Popkins without it, and one member fewer for
  the others; AC3 and AC4 on the card), L2-056 (AC3: "Leaving…"), L2-058 (My Popkins at 390,
  768, 1024 and 1440 px).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | The member’s home on a phone, in the dark theme, over an aurora | Time to **go.** |
| 0:08 | 5 | `menu` | Popkin settings on a phone; the menu, then "Leave this Popkin", close up | A member’s **menu.** |
| 0:18 | 6 | `ask` | "Leave Lakeside Weekend?", what stays and "Leave" and "Stay" close up; the dialog in a browser window | What **stays.** |
| 0:30 | 6 | `gone` | "Leaving…" close up; the dialog on a phone, then My Popkins without Lakeside Weekend on a phone and a tablet | Gone from **the list.** |
| 0:42 | 5 | `fewer` | The Host’s home on a phone, "14 members" then "13 members" close up | One **fewer.** |
| 0:52 | 5 | `grow` | My Popkins growing from 390 to 768, 1024 and 1440 px | Every **width.** |
| 1:02 | 6 | `proof` | The Host’s menu, without a way to leave; then "We couldn’t take you out." close up; two facts | The Host **stays.** |
| 1:14 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `gone`, `grow` and `proof`); inside an
act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: each state is opened by its key in
  `e2e/fixtures/routes.ts` (`popkinSettingsMember`, `popkinSettings`, `leavePopkin`,
  `leavePopkinBusy`, `leavePopkinFailed`, `popkinHome`) with its step from
  `e2e/fixtures/leave-states.ts` or `wrap-up-states.ts`. Every `/api` request was answered in
  memory by the fixtures or the recording, and the hub was stubbed (ADR 0005, ADR 0010); no
  backend and no database ran.
- **The scenes are separate takes.** My Popkins is what "Leave" opened in the app, its list
  answered without Lakeside Weekend by `e2e/fixtures/leaving.ts`. "13 members" is the Host’s
  home after the stubbed hub pushed `MemberLeft` for Joel; that the API sends it, and that the
  one who left hears nothing more, is proved by `LeavePopkinTests`, not shown.
- **Nothing on screen shows** that the Host is refused even a request made by hand (`403`
  `host_cannot_leave`), that every later request of a former member in the Popkin is `404`
  `popkin_not_found`, or that leaving takes them off the group call; the card says the first two.
- It leaves out, though they are built and tested: "Stay" and Escape, which keep the member in
  the Popkin with the focus back on "Popkin settings"; the not-found screen after going back to
  the Popkin; the chat header counting one member fewer; and coming back with a new invite.

## Build it again

From the repository root, with the app’s dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/11-journey-18-leave-a-popkin
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/11-journey-18-leave-a-popkin
node tools/video-build/build.mjs docs/videos/11-journey-18-leave-a-popkin --crf 23
```
