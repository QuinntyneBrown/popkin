# 17 · Journey 16: Change Popkin settings

Plans change after a Popkin starts. Mara, the Host of Lakeside Weekend, opens Popkin settings
and finds four rows: "Edit name and look", "Change how long it lasts", "Invite people" and "Wrap
up". She renames it "Lakeside Long Weekend", with 🎉 and plum, and the home shows it at once; an
empty name is marked "Give your Popkin a name." and nothing is sent. In "How long should it
last?" she moves the end from Sunday to Monday at 6 pm, and the time left reads "2 days 6 hrs
left". Another member's home follows the change without a reload. In the last hour, the Host's
"Change" on the banner opens the same dialog.

- **Film:** [`17-journey-16-change-popkin-settings.mp4`](17-journey-16-change-popkin-settings.mp4),
  1920×1080, 30 fps, 1 min 42 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally, from the same weights in `.cache/kokoro` as
  videos 01 to 16.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 16. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars.
- **Requirements shown:** L2-020 (AC1: the Host's menu; AC3: the name and look; AC4: how long it
  lasts; both reaching every member), L2-008 (AC3: the empty name), L2-009 (the four lengths and
  the date), L2-044 (AC2: the Host's "Change" on the banner of the last hour), L2-058 (the dialog
  as a sheet on a phone and a panel on a larger screen).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | The Host's menu on a phone, in the dark theme, over an aurora | Plans **change.** |
| 0:06 | 5 | `menu` | The menu on a phone; its four rows close up | Four for **the Host.** |
| 0:16 | 7 | `edit` | "Edit name and look" filled in; the home's header before and after | A new **name.** |
| 0:30 | 3 | `invalid` | The empty name marked | Never **empty.** |
| 0:36 | 7 | `length` | "How long should it last?", then "Until a date" on Monday; the time left before and after | Until **Monday.** |
| 0:50 | 6 | `live` | Another member's home in a browser window, before and after the change | No **reload.** |
| 1:02 | 4 | `banner` | The banner of the last hour with "Change"; the phone, then the dialog it opens | Change, in **one tap.** |
| 1:10 | 6 | `grow` | "Edit name and look" growing from 390 to 768, 1024 and 1440 px | A sheet, **then a panel.** |
| 1:22 | 6 | `proof` | A card: what no screen shows and what is still to come | The Host’s **alone.** |
| 1:34 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `edit`, `length`, `grow` and `proof`);
inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: Mara at the home with `maraWithSettings`
  (`e2e/fixtures/settings.ts`), the dialogs opened by `openEditPopkin` and `openChangeLength`, and
  the member's change pushed as `PopkinChanged` through the stubbed hub. Every `/api` request was
  answered in memory by the fixtures (ADR 0005); no backend and no database ran.
- **Nothing on screen shows** that a member who is not the Host is refused (`403 host_only`),
  that a wrapped-up Popkin cannot be changed (`409 popkin_wrapped_up`), or that a late event never
  undoes a newer change (each change carries a version). The API tests, the unit tests of the
  stores and the behaviour specs prove them, and the film says so on a card.
- It leaves out, though they are built and tested: "Saving…", the failures that keep the dialog
  open ("We couldn’t save that.", "We couldn’t change that. It still wraps up Sunday at 6 pm."),
  "Keep it going" and "Just today", and the new name in the Everyone thread and in Photos.
- **Still to come:** the Popkin's own address, shown read-only in "Edit name and look" and kept
  when the Popkin is renamed (L2-066); Popkin has no address yet.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/17-journey-16-change-popkin-settings
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/17-journey-16-change-popkin-settings
node tools/video-build/build.mjs docs/videos/17-journey-16-change-popkin-settings
```
