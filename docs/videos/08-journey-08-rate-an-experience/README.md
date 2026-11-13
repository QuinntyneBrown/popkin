# 08 · Journey 8: Rate an experience

The group says what the best part was. Experiences lists what the group did and what it wants to
do next as cards, with the filters "All", "We did" and "Want to do". "Share one" opens Share an
experience; "Share it" puts the new experience first in the list, with a toast. An experience has
a page of its own with the group's score and a bar for each star. Five stars ask "How was it for
you?"; one tap answers "Thanks! Your rating" and offers "Add a comment", which lands first under
"What people said". Its sharer can edit it or delete it, after a confirmation. The Popkin home
shows the highest rated.

- **Film:** [`08-journey-08-rate-an-experience.mp4`](08-journey-08-rate-an-experience.mp4),
  1920×1080, 30 fps, 2 min 12 s. Captions: [`captions.vtt`](captions.vtt), not burned in.
- **Voice:** Kokoro-82M (`af_heart`), run locally.
- **Music:** *En La Playa – Trinidad and Tobago Soca* by JuliusH, from Pixabay
  ([credits](../assets/music/CREDITS.md)), reused from videos 01 to 07. 120 BPM; a bar is two
  seconds and every scene is a whole number of bars. The track is 116 seconds long, so it starts
  again, on a bar, at 1:56.
- **Requirements shown:** L2-037 (AC1 to AC4), L2-038 (AC1, AC2, AC4), L2-039 (AC1, AC2),
  L2-040 (AC1, AC4, AC6), L2-041 (AC1, AC3), L2-019 (AC5: the highest rated on the home), L2-058 (the
  cards and the experience's page as the screen grows).

## Run sheet

| At | Bars | Scene | Picture | Headline |
|---|---|---|---|---|
| 0:00 | 4 | `hook` | Experiences on a phone, in the dark theme, over an aurora | The best part? **Everyone says.** |
| 0:08 | 7 | `list` | Experiences on a phone; the cards of the canoe ("4.7 (11)") and the beach day ("7 keen") close up; "All", "We did", "Want to do" pressed in turn | What we did, **and what’s next.** |
| 0:22 | 6 | `share` | "Share one", then Share an experience, empty and filled; the kinds close up | Share one. **Then, Share it.** |
| 0:34 | 4 | `shared` | The list with "Bonfire songs on the beach" first; its card and the toast "Experience shared" close up | First **in the list.** |
| 0:42 | 5 | `detail` | The canoe's page; its kind, title, sharer and place, and the score card "4.7", "11 ratings" close up | The group’s **score.** |
| 0:52 | 5 | `rate` | "How was it for you?", then "Thanks! Your rating" with five stars and "Add a comment"; the score at "4.8", "12 ratings" | Five stars. **One tap.** |
| 1:02 | 5 | `comment` | The comment dialog with "Your comment" and "Post comment"; then the comment first under "What people said" | Add a **comment.** |
| 1:12 | 8 | `actions` | One phone: "Experience actions", the dialog with "Edit" and "Delete", "Edit experience", "Delete this experience?", then the list with the toast "Experience deleted" | Yours to **edit or delete.** |
| 1:28 | 4 | `home` | The Popkin home on a tablet; its Experiences section on a phone close up | The highest rated, **on the home.** |
| 1:36 | 8 | `grow` | Experiences growing from 390 to 768, 1024 and 1440 px; then an experience at 1024 px, its ratings close up | One across, **then four.** |
| 1:52 | 6 | `proof` | A card: what no screen shows and what is still to come | One rating **each.** |
| 2:04 | 4 | `close` | The name over the aurora | Popkin |

A wipe in a Popkin colour marks each change of act (into `detail`, `actions`, `grow` and
`proof`); inside an act the cuts are hard.

## What it proves, and what it does not

- Every picture is a screenshot of the running app, taken by [`shots.ts`](shots.ts) with the
  fixtures and page objects of `e2e/`. Every `/api` request was answered in memory by
  `e2e/fixtures/experiences.ts`, the home's stub or the recording (ADR 0005); no backend and no
  database ran. Nothing the film shows was saved anywhere.
- **The experiences are the mocks' four** in Lakeside Weekend, on the mocks' Saturday: the
  sunrise canoe, La Paloma Taqueria, the ridge trail loop and the beach day. The member is Mara,
  the Host, who shared the canoe: she rates it, comments on it, and has both of its actions.
- **The scenes are separate takes**, each from the mocks' four: the bonfire of `shared` is not in
  the list of `actions`, and the list after "Delete" shows three.
- **The home's Experiences section is the home's own stub**, not the list of the other scenes: it
  reads "4.7 · 11 ratings" for the canoe whatever was rated in `rate`. The film does not show the
  home following a new rating.
- "Four across" is filmed at 1440 px and labelled "From 1280 px", and "two across" at 768 px:
  the breakpoints are the ones `e2e/tests/experiences.spec.ts` proves (two from 640 px, three
  from 1024 px, four from 1280 px), which the narration and the labels follow.
- In `share` the filled dialog is shown scrolled to its picture and "Share it", so its heading
  and the label "Title" are off the top of the phone.
- "Edit experience" is opened and closed; no edit is saved on screen ("Save changes" is not
  shown).
- **Nothing on screen shows** that each member has one rating, that a different star changes it
  while the count stays the same, or that the Host can delete any experience; the film says so on
  a card.
- Not built, and not claimed: saying you are keen (L2-042, journey 20), named on the card as
  still to come. The card of the beach day shows "7 keen" because the fixture says so.
- It leaves out, though they are built and tested: Experiences empty, loading and failing; a
  filter with nothing in it; the dialog's invalid, busy and failed states; a picture that is too
  large; the Popkin's emoji for an experience with no picture; "Nobody has rated it yet"; a
  rating that does not save; the arrow keys on the stars; "Edit your comment"; "Keep it"; the
  Host's single action on someone else's experience; and the not-found screen.

## Build it again

From the repository root, with the app's dependencies installed (`README.md`):

```shell
node tools/video-record/record.mjs docs/videos/08-journey-08-rate-an-experience
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/08-journey-08-rate-an-experience
node tools/video-build/build.mjs docs/videos/08-journey-08-rate-an-experience --crf 23
```
