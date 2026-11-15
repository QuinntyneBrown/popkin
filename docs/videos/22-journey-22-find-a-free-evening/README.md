# 22 · Journey 22: Find a free evening

Members enter their time off and working hours and see when everyone is free. Mara opens the
Schedule of Cabin Week ’27. Time off shows the event's week: a row for each member, a column for
each day, Off, Tentative or Working, the event's days under its label and "6 of 6 off" in bold
where everyone is off. "Add my time off" sets Mara's own week a day at a time, and her row fills
in. This week shows the next seven evenings and how many are free on each; on Wednesday
"Everyone’s free from 7:30 pm", and a timeline from noon to midnight shows who works when. "My
hours" takes up to two stretches a day on the quarter hour. "Plan dinner in chat" opens the
Everyone thread with a draft, not sent; on an evening someone works it asks those who are free.
The Popkin home names the next free evening, and the Host sets the event from Popkin settings.
With Schedules switched off, the tab is gone and its screens say so; nothing is lost.

- **Film:** [`22-journey-22-find-a-free-evening.mp4`](22-journey-22-find-a-free-evening.mp4),
  1920×1080, 30 fps, 2 min 8 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally with `kokoro-onnx`, as in the films before it.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from the films before it. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar.
- **Requirements shown:** L2-072 (Time off: the tab between Chat and Photos, the week, the counts,
  the bold heading, the event's label, the legend, the table scrolling inside the screen on a
  phone, live updates), L2-073 (Add my time off), L2-074 (This week: the day buttons, "{n}/{members}
  free", the headline, the timeline as text, My hours, "Plan dinner in chat" and "Ask in chat
  anyway", the action beside the headline from 1024 px), L2-075 (AC2: the home's Schedule
  section), L2-077 (Schedules switched off) and L2-085 (Set the event).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 3 | `hook` | Time off on a phone, in the dark | Everyone **free?** |
| 0:06 | 6 | `timeoff` | Time off at 1440 px in a browser window; the week's heading and the legend close up | Who’s **off when.** |
| 0:18 | 6 | `add` | Add my time off, then the week with Mara's row filled in; her row close up | Your own **week.** |
| 0:30 | 5 | `thisweek` | This week; the day buttons and "Everyone’s free" close up | Seven **evenings.** |
| 0:40 | 5 | `shifts` | The timeline close up | Noon to **midnight.** |
| 0:50 | 4 | `hours` | My hours on a phone | Two stretches, **quarter hours.** |
| 0:58 | 6 | `dinner` | The Everyone thread with the draft; the draft, then "Ask in chat anyway", close up | A draft, **not sent.** |
| 1:10 | 4 | `home` | The Popkin home at 1440 px; its Schedule section close up | Next **free evening.** |
| 1:18 | 4 | `event` | Set the event on a phone | What we’re **here for.** |
| 1:26 | 6 | `grow` | This week growing from 390 to 1440 px | Phone to **desktop.** |
| 1:38 | 5 | `off` | "Schedules is switched off" on a phone | Off, **nothing lost.** |
| 1:48 | 6 | `proof` | A card: what no screen shows | Yours **to change.** |
| 2:00 | 4 | `close` | The name: "A platform for pop-up communities." | Popkin |

A wipe in a Popkin colour marks each change of act (into `thisweek` and `home`); inside an act the
cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`: the Schedule of `e2e/fixtures/schedule.ts`
  (`maraWithASchedule`, `maraThisWeek`, `theMocksTimeOff`, `theMocksHours`), the event of
  `e2e/fixtures/event.ts` (`maraWithAnEvent`), and the page objects `TimeOffPage`,
  `ThisWeekPage`, `AddTimeOffDialog`, `MyHoursDialog`, `GroupChatPage` and `PopkinHomePage`, as in
  `e2e/tests/time-off.spec.ts`, `this-week.spec.ts` and `set-event.spec.ts`. Every `/api` request
  was answered in memory by those fixtures, the hub by `e2e/fixtures/hub.ts` (ADR 0005,
  ADR 0010); no backend and no database ran.
- **Every screen is Mara's.** That a save reaches the others without a reload is said, not shown;
  `e2e/tests/schedule-live.spec.ts` proves it by pushing `ScheduleChanged` through the stubbed hub,
  and `backend/tests/Popkin.Api.Tests` the event sent to members alone.
- **Nothing on screen shows** that a member changes only their own row (403), that a wrapped-up
  Popkin's Schedule refuses every write (409, `WrappedUpScheduleTests.cs`) or that every Schedules
  endpoint answers 404 `feature_off` while the switch is off; the film says so on a card.
- The event shot shows the dialog of the Host, Mara here, with an event already set ("Cabin week",
  15 to 19 February 2027), so "Remove the event" is there.
- It leaves out, though they are built and tested: the loading, empty and error states, a save
  that fails, a week a year ahead, the off screen of This week and an open screen that turns off
  within a minute. `shots.ts` also saves screens the film does not use.
- **The times** are the mocks': Time off shows the event's week of 15 February 2027, and This week
  the seven days from Saturday 12 September 2026.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/22-journey-22-find-a-free-evening
python tools/video-audio/film_audio.py docs/videos/22-journey-22-find-a-free-evening
node tools/video-build/build.mjs docs/videos/22-journey-22-find-a-free-evening
```
