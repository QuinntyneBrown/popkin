# video-build

Opens a video folder's `slides.html` in headless Chromium, seeks it frame by frame and encodes the
MP4 with ffmpeg. Standard: `docs/videos/README.md`, "Slides and motion".

```
node tools/video-build/build.mjs docs/videos/NN-journey-JJ-topic --check                # the schedule and how each line fits
node tools/video-build/build.mjs docs/videos/NN-journey-JJ-topic --frame 12.5 out.png   # one frame, at film seconds
node tools/video-build/build.mjs docs/videos/NN-journey-JJ-topic                        # NN-journey-JJ-topic.mp4
node tools/video-build/build.mjs docs/videos/NN-journey-JJ-topic --captions             # the same, captions burned in
```

`--crf <n>` sets the quality (default 21; 20 to 23). `FFMPEG_PATH` overrides ffmpeg, which needs
libx264. Playwright is the copy in `e2e/node_modules` (found there, or through `NODE_PATH`). Run
`tools/video-audio` first: the build needs `timing.js` and, for the MP4, the MP3.

What it does: 1920×1080 at 30 fps; one `window.seek(seconds)` and one JPEG (quality 98) a frame,
piped to ffmpeg (`libx264 -preset slow -pix_fmt yuv420p -movflags +faststart`, AAC from the MP3);
the page is reopened every 600 frames and a frame is retried after a crash; the film is written to
`name.partial.mp4` and renamed when ffmpeg ends well. Chromium runs with
`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, so WebGL draws.

It stops with an error, encoding nothing, when a font is not loaded, a picture is missing, a
request fails, a scene of `narration.json` has no drawing, a token does not exist, a WebGL context
cannot be made or a script throws.

## The deck it expects

`slides.html` links `docs/design-system/tokens/tokens.css` and `docs/videos/assets/film.css`, then
loads `timing.js`, `docs/videos/assets/film-runtime.js` and the folder's `film.js`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>NN · the video's name</title>
<link rel="stylesheet" href="../../design-system/tokens/tokens.css">
<link rel="stylesheet" href="../assets/film.css">
</head>
<body>
<script src="timing.js"></script>
<script src="../assets/film-runtime.js"></script>
<script src="film.js"></script>
</body>
</html>
```

The runtime gives the page `window.seek(seconds)`, `window.filmDuration`, `window.filmReady` (a
promise: fonts and pictures are in) and `window.filmErrors`. Opened by a person, the page plays
against the MP3: Space plays and pauses, the arrows step a beat, C shows captions, `?t=12.5` opens
on that time. The API a `film.js` is written against is described at the top of
`docs/videos/assets/film-runtime.js`.
