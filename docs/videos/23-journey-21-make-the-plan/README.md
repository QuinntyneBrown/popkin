# 23 · Journey 21: Make the plan

Members add stories to the plan board, move them to Done and read the burn-down. Mara opens the
Plan of Cabin Week ’27. The plan board shows Backlog, To do, Doing and Done, each with its stories
and its points, the sprint "Aug 30 – Sep 26" with 14 days left, and the sprint chip: "24 pts
left · 7 behind" beside its sparkline. "New story" takes what needs doing, where it goes, how big
it is, who's on it and a tag, and "Who brings what: packing list" lands in To do. The Story dialog
of "Book the cabin at Pine Hollow" changes it, and "Mark done" moves it to Done with a tick. A
story another member adds arrives on the open board without a reload. The burn-down shows the
points left each day against the ideal line, "7 behind", "Finishes Sep 30 · 4 days late" and the
biggest stories still open. The Popkin home shows the plan at a glance and the recap counts "12 of
14 stories done". With Plan switched off, the tab is gone and its screens say so; nothing is lost.

- **Film:** [`23-journey-21-make-the-plan.mp4`](23-journey-21-make-the-plan.mp4), 1920×1080,
  30 fps, 2 min 2 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally with `kokoro-onnx`, as in the films before it.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the films before it. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar.
- **Requirements shown:** L2-068 (the plan board, its columns, counts and points, the sprint, the
  sprint chip and its sparkline, live updates, the floating "New story" on a phone and the columns
  sharing the width from 1024 px), L2-069 (New story), L2-070 (the Story dialog and "Mark done"),
  L2-071 (the burn-down: the headline, "7 behind", the forecast, the chart and "Biggest open"),
  L2-075 (AC1 the home's Plan section, AC4 the recap's count) and L2-077 (Plan switched off).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | The board on a phone, in the dark | Make the **plan.** |
| 0:06 | 6 | `board` | The board at 1440 px in a browser window; Doing, then the sprint chip, close up | Four **columns.** |
| 0:18 | 6 | `new` | New story on a phone; To do with the new story, close up | What needs **doing?** |
| 0:30 | 6 | `done` | The Story dialog, then the board; "Mark done", then Done, close up | Move it **on.** |
| 0:42 | 5 | `live` | To do before and after another member's story arrives | No **reload.** |
| 0:52 | 6 | `burn` | The burn-down's headline, forecast and chart, close up | Seven **behind.** |
| 1:04 | 4 | `biggest` | The burn-down at 1440 px; "Biggest open" close up | What’s **left.** |
| 1:12 | 5 | `home` | The home's Plan section and the recap's count, close up | At a **glance.** |
| 1:22 | 6 | `grow` | The board growing from 390 to 1440 px | Phone to **desktop.** |
| 1:34 | 4 | `off` | "Plan is switched off" on a phone | Off, **nothing lost.** |
| 1:42 | 6 | `proof` | A card: what no screen shows | Yours **to delete.** |
| 1:54 | 4 | `close` | The name: "A platform for pop-up communities." | Popkin |

A wipe in a Popkin colour marks each change of act (into `burn` and `home`); inside an act the
cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: the Plan of `e2e/fixtures/plan.ts` (`maraWithAPlan`,
  `openNewStory`, `openStory`, `story`), the recap of `e2e/fixtures/wrap-up.ts`
  (`theMockRecap`), and the page objects `PlanBoardPage`, `NewStoryDialog`, `StoryDialog`,
  `BurnDownPage`, `PopkinHomePage` and `RecapPage`, as in `e2e/tests/plan-board.spec.ts`,
  `plan-live.spec.ts`, `burn-down.spec.ts`, `home-plan.spec.ts` and `plan-recap.spec.ts`. Every
  `/api` request was answered in memory by those fixtures, the hub by `e2e/fixtures/hub.ts`
  (ADR 0005, ADR 0010); no backend and no database ran.
- **The live scene** shows Mara's board after `PlanChanged` was pushed through the stubbed hub,
  as `e2e/tests/plan-live.spec.ts` does; the other member's screen is not shown.
- **Nothing on screen shows** that only whoever added a story, its owner or the Host may delete it
  (403 `not_your_story`), that a wrapped-up Popkin's plan refuses every write (409) or that every
  Plan endpoint answers 404 `feature_off` while the switch is off; the film says so on a card.
- At 1024 px the four columns share the width but, beside the sidebar, still scroll sideways,
  each at least 14.5 rem wide; all four show side by side at 1440 px, as the mocks draw it.
- It leaves out, though they are built and tested: the empty board with its starters, the
  loading, error and read-only states, a story refused or failing, saving changes, deleting a
  story and "Delete this story?", the Story dialog of someone who may not delete, and the
  burn-down's empty and done states. `shots.ts` also saves screens the film does not use.
- **The time** is the mocks': Saturday 12 September 2026, day 14 of the sprint "Aug 30 – Sep 26".

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/23-journey-21-make-the-plan
python tools/video-audio/film_audio.py docs/videos/23-journey-21-make-the-plan
node tools/video-build/build.mjs docs/videos/23-journey-21-make-the-plan
```
