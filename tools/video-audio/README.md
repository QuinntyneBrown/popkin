# video-audio

Speaks a video's `narration.json` with Kokoro-82M, fits each line to its scene, mixes the music
under it, and writes the MP3, `captions.vtt` and `timing.js`. Standard: `docs/videos/README.md`,
"Narration" and "Music".

```
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/NN-journey-JJ-topic          # everything
.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/NN-journey-JJ-topic --grid   # timing.js only, nothing spoken
.cache/video-venv/bin/python tools/video-audio/tempo.py docs/videos/assets/music/<slug>.mp3           # the track's BPM and first beat
```

## Setup, once

```
/opt/homebrew/bin/python3.12 -m venv .cache/video-venv     # any Python from 3.10
.cache/video-venv/bin/pip install kokoro-onnx numpy
```

ffmpeg must be on the path (`FFMPEG_PATH` overrides). The model (`onnx/model.onnx`, about 310 MB)
and the voice are taken from `.cache/kokoro` (`KOKORO_DIR` overrides), else from the Hugging Face
cache in the home folder, else downloaded once from `onnx-community/Kokoro-82M-v1.0-ONNX` into
`.cache/kokoro`. Where Hugging Face cannot be reached, the same model is in the `kokoro-onnx`
project's GitHub release `model-files-v1.0`: save `kokoro-v1.0.onnx` as `.cache/kokoro/kokoro.onnx`,
and write the voice out of `voices-v1.0.bin` as raw float32,
`numpy.load("voices-v1.0.bin")["af_heart"].tofile(".cache/kokoro/af_heart.bin")`. Spoken lines are cached in `.cache/kokoro/lines` by voice, speed and text.

## `narration.json`

```json
{
  "voice": "af_heart",
  "bpm": 112,
  "beatsPerBar": 4,
  "gapBeats": 1,
  "outroSeconds": 3,
  "music": { "file": "../assets/music/<slug>.mp3", "offset": 0.29, "duckDb": 16, "betweenDb": 5, "fadeSeconds": 2 },
  "scenes": [
    { "id": "hook", "bars": 4, "lines": ["Start a Popkin in seconds.", "It begins with your name."] },
    { "id": "sizes", "bars": 5, "lines": [{ "text": "The same screen fits a phone and a desktop.", "at": 2, "caption": "…" }] },
    { "id": "close", "seconds": 6 }
  ]
}
```

| Field | Meaning | Default |
|-------|---------|---------|
| `voice` | A Kokoro voice. | `af_heart` |
| `bpm` | The tempo of the track (`tempo.py` measures it). Required. | |
| `beatsPerBar` | Beats in a bar. | 4 |
| `gapBeats` | Music alone between two lines, and between the last line of a scene and the cut. | 1 |
| `outroSeconds` | Music alone at the end; no line may run into it. | 3 |
| `music.file` | The track, relative to the video folder. Leave `music` out and the mix is the voice alone, with a loud "Music: pending". | |
| `music.offset` | Seconds of the track to skip, so film time 0 falls on a beat (`tempo.py` prints the first beat). | 0 |
| `music.duckDb` | How far under the voice the music sits while a line is spoken (14 to 18). | 16 |
| `music.betweenDb` | How far under the voice it sits between lines. | 5 |
| `music.fadeSeconds` | The fade at the very end, inside the outro. | 2 |
| `scenes[].id` | The name `film.js` draws the scene by. Scenes play in order, one after another. | |
| `scenes[].bars` or `.seconds` | The scene's length. Use bars, so cuts fall on the grid. | |
| `scenes[].lines[]` | A string, or `{ "text", "at", "caption" }`. `at` is the beat of the scene the line starts on; a line without `at` follows the one before it after `gapBeats`. `caption` replaces the text in `captions.vtt`. | |

How lines are placed: the first line of a scene starts at the scene's start (`at` 0), except that
nothing is spoken in the first bar of the film. A line with `at`, and the lines after it up to the
next line with `at`, share one window: from that beat to the next `at` (or the end of the scene)
less `gapBeats`. All of them are spoken at the slowest speed from 1.0 to 1.8 (steps of 0.05) at
which they fit; the tool stops, naming the scene and the line, when 1.8 is not enough.

## What it writes

| File | What it is |
|------|------------|
| `<folder>/<folder name>.mp3` | The mix, 44.1 kHz stereo, about −16 LUFS (one gain for the whole film, then a limiter). The music eases down over 150 ms before each line and up over 250 ms after it; a track shorter than the film loops on a whole number of bars. |
| `<folder>/captions.vtt` | One cue a line in film time; a line over 84 characters is split. |
| `<folder>/timing.js` | `window.FILM_TIMING = { name, audio, voice, bpm, beatsPerBar, beat, bar, duration, music, scenes: [{ id, start, length, bars }], lines: [{ scene, text, caption, start, end, speed, window }], captions: [{ start, end, text }] }`, read by `docs/videos/assets/film-runtime.js` and by `tools/video-build`. |
| `<folder>/narration.wav` | The fitted voice alone. Never committed. |
