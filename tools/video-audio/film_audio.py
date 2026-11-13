#!/usr/bin/env python3
"""Build the soundtrack of a video: the narration, the music under it and the timing the film reads.

    python tools/video-audio/film_audio.py docs/videos/NN-journey-JJ-topic            everything
    python tools/video-audio/film_audio.py docs/videos/NN-journey-JJ-topic --grid     timing.js only

Reads   narration.json   the voice, the grid, the scenes and their lines (schema in README.md)
Writes  NN-...mp3        the mix: voice over ducked music, about -16 LUFS
        captions.vtt     captions in film time
        timing.js        window.FILM_TIMING: the grid, the scenes, the spoken lines, the captions
        narration.wav    the fitted voice alone (never committed)

Each line is spoken with Kokoro-82M at the slowest speed from 1.0 to 1.8 that fits its window, and
the build stops if one cannot fit. --grid writes the scene grid without speaking, so the film can
be laid out before the words are final. Standard: docs/videos/README.md.
Needs: pip install kokoro-onnx numpy, and ffmpeg (FFMPEG_PATH overrides).
"""
import argparse, hashlib, json, os, subprocess, sys, urllib.request, wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(os.environ.get("KOKORO_DIR", ROOT / ".cache" / "kokoro"))
HUB = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main"
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")
VOICE_SR, SR = 24000, 44100
SPEEDS = [round(1.0 + 0.05 * i, 2) for i in range(17)]  # 1.0 .. 1.8
DUCK_DOWN, DUCK_UP = 0.15, 0.25  # seconds the music takes to ease down before a line and up after


def stop(message):
    sys.exit(f"film_audio: {message}")


def ffmpeg(*argv, capture=False):
    run = subprocess.run([FFMPEG, "-hide_banner", "-y", *map(str, argv)], capture_output=True)
    if run.returncode != 0:
        stop(f"ffmpeg failed: {run.stderr.decode(errors='replace')[-600:]}")
    return run.stdout if capture else run.stderr.decode(errors="replace")


def decode(path, channels):
    """A sound file as float32 at 44.1 kHz, shaped (n, channels)."""
    raw = ffmpeg("-loglevel", "error", "-i", path, "-f", "f32le", "-ac", channels, "-ar", SR, "pipe:1", capture=True)
    return np.frombuffer(raw, dtype="<f4").reshape(-1, channels)


def write_wav(path, x, sr):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1 if x.ndim == 1 else x.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def stamp(t):
    return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{t % 60:06.3f}"


# ── The grid ─────────────────────────────────────────────────────────────────────────────────────────

def grid(spec):
    """The scenes on the bar grid, each with its lines grouped into the windows they must fit."""
    bpm, per_bar = float(spec["bpm"]), int(spec.get("beatsPerBar", 4))
    beat = 60 / bpm
    bar = beat * per_bar
    gap = float(spec.get("gapBeats", 1)) * beat  # music alone between lines and before a cut
    scenes, at = [], 0.0
    for raw in spec["scenes"]:
        length = raw["bars"] * bar if "bars" in raw else float(raw["seconds"])
        scenes.append({"id": raw["id"], "start": round(at, 4), "length": round(length, 4), "bars": raw.get("bars"), "raw": raw})
        at += length
    duration = at
    outro = float(spec.get("outroSeconds", 3))
    for scene in scenes:
        groups = []
        for line in scene["raw"].get("lines", []):
            line = {"text": line} if isinstance(line, str) else dict(line)
            if "at" in line or not groups:
                groups.append({"start": scene["start"] + float(line.get("at", 0)) * beat, "lines": []})
            groups[-1]["lines"].append(line)
        ends = [g["start"] for g in groups[1:]] + [scene["start"] + scene["length"]]
        for group, end in zip(groups, ends):
            group["start"] = max(group["start"], bar)  # one bar of music alone before the first word
            group["end"] = min(end - gap, duration - outro)  # and the outro alone after the last
        scene["groups"] = groups
    return {"bpm": bpm, "beatsPerBar": per_bar, "beat": beat, "bar": bar, "gap": gap, "duration": duration, "outro": outro, "scenes": scenes}


# ── Narration ────────────────────────────────────────────────────────────────────────────────────────

def fetch(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading {url}")
    part = dest.with_suffix(dest.suffix + ".part")
    urllib.request.urlretrieve(url, part)
    part.rename(dest)


def kokoro(voice):
    """The model and the voice: from .cache/kokoro, else the Hugging Face cache, else downloaded once."""
    from kokoro_onnx import Kokoro
    hub = sorted(Path.home().glob(".cache/huggingface/hub/models--onnx-community--Kokoro-82M-v1.0-ONNX/snapshots/*"))
    model = next((p for p in [CACHE / "kokoro.onnx", *(h / "onnx/model.onnx" for h in hub)] if p.exists()), None)
    style = next((p for p in [CACHE / f"{voice}.bin", *(h / f"voices/{voice}.bin" for h in hub)] if p.exists()), None)
    if model is None:
        model = CACHE / "kokoro.onnx"
        fetch(f"{HUB}/onnx/model.onnx", model)
    if style is None:
        style = CACHE / f"{voice}.bin"
        fetch(f"{HUB}/voices/{voice}.bin", style)
    # kokoro-onnx reads voices from an .npz; the Hub ships one raw float32 file per voice.
    CACHE.mkdir(parents=True, exist_ok=True)
    npz = CACHE / f"{voice}.npz"
    if not npz.exists():
        np.savez(npz, **{voice: np.fromfile(style, dtype=np.float32).reshape(-1, 1, 256)})
    return Kokoro(str(model), str(npz))


class Voice:
    """Speaks a line at a speed, trimmed of silence at both ends; cached by text, voice and speed."""

    def __init__(self, voice):
        self.voice, self.tts, self.dir = voice, None, CACHE / "lines"
        self.dir.mkdir(parents=True, exist_ok=True)

    def say(self, text, speed):
        key = hashlib.sha1(f"{self.voice}|{speed:.2f}|{text}".encode()).hexdigest()
        path = self.dir / f"{key}.npy"
        if path.exists():
            return np.load(path)
        self.tts = self.tts or kokoro(self.voice)
        x, sr = self.tts.create(text, voice=self.voice, speed=speed, lang="en-us")
        if sr != VOICE_SR:
            stop(f"Kokoro spoke at {sr} Hz, expected {VOICE_SR}")
        x = np.asarray(x, dtype=np.float32)
        loud = np.flatnonzero(np.abs(x) > 0.02 * np.abs(x).max())
        x = x[max(0, loud[0] - int(0.01 * sr)): loud[-1] + int(0.04 * sr)]
        x = x / max(1e-6, float(np.abs(x).max()))
        np.save(path, x)
        return x


def narrate(folder, spec, g):
    """Place every line on its film time. Returns the voice track (24 kHz mono) and the spoken lines."""
    voice = Voice(spec.get("voice", "af_heart"))
    out = np.zeros(int(g["duration"] * VOICE_SR) + 1, dtype=np.float32)
    said = []
    for scene in g["scenes"]:
        for group in scene["groups"]:
            window = group["end"] - group["start"]
            texts = [line["text"] for line in group["lines"]]

            def length(speed):
                return sum(len(voice.say(t, speed)) for t in texts) / VOICE_SR + g["gap"] * (len(texts) - 1)

            # The slowest speed that fits. Start from the estimate, so a line is not spoken 17 times.
            first = next((v for v in SPEEDS if length(1.0) / v <= window * 1.03), SPEEDS[-1]) if window > 0 else SPEEDS[-1]
            speed = next((v for v in SPEEDS[max(0, SPEEDS.index(first) - 1):] if length(v) <= window), None)
            if speed is None:
                stop(f"scene \"{scene['id']}\": \"{texts[0][:60]}\" takes {length(SPEEDS[-1]):.2f} s at speed 1.8 "
                     f"and its window is {window:.2f} s. Shorten the line or give the scene another bar.")
            at = group["start"]
            for line in group["lines"]:
                x = voice.say(line["text"], speed)
                i = int(at * VOICE_SR)
                out[i:i + len(x)] += x
                end = at + len(x) / VOICE_SR
                words = len(line["text"].split())
                said.append({"scene": scene["id"], "text": line["text"], "caption": line.get("caption", line["text"]),
                             "start": round(at, 3), "end": round(end, 3), "speed": speed,
                             "window": [round(group["start"], 3), round(group["end"], 3)]})
                print(f"  {at:6.2f}-{end:6.2f}  x{speed:.2f}  {words / (end - at) * 60:4.0f} wpm  {scene['id']}: {line['text']}")
                at = end + g["gap"]
    write_wav(folder / "narration.wav", out * 0.89, VOICE_SR)
    return said


def captions(said, limit=84):
    """One cue a line; a long line is split at word boundaries and shares its time by length."""
    cues = []
    for line in said:
        parts, words = [], line["caption"].split()
        for word in words:
            if parts and len(parts[-1]) + 1 + len(word) <= limit:
                parts[-1] += " " + word
            else:
                parts.append(word)
        total, at = sum(map(len, parts)), line["start"]
        for part in parts:
            end = at + (line["end"] - line["start"]) * len(part) / total
            cues.append({"start": round(at, 3), "end": round(end, 3), "text": part})
            at = end
        cues[-1]["end"] = round(line["end"] + 0.3, 3)
    for a, b in zip(cues, cues[1:]):
        a["end"] = min(a["end"], b["start"])
    return cues


# ── The mix ──────────────────────────────────────────────────────────────────────────────────────────

def rms_db(x):
    """The level of the loud part of a signal, in dB: silence between words does not count."""
    power = np.mean(np.asarray(x, dtype=np.float64) ** 2, axis=-1) if x.ndim > 1 else np.asarray(x, dtype=np.float64) ** 2
    frames = power[: len(power) // 2048 * 2048].reshape(-1, 2048).mean(axis=1)
    loud = frames[frames > frames.max() * 1e-3]
    return 10 * np.log10(max(1e-12, float(loud.mean())))


def lufs(path):
    """The integrated loudness of a sound file."""
    log = ffmpeg("-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-")
    return float(json.loads(log[log.rindex("{"): log.rindex("}") + 1])["input_i"])


def music_bed(path, g, offset):
    """The track from `offset`, as long as the film; a short track loops on a whole number of bars."""
    track = decode(path, 2)[int(offset * SR):]
    n = int(g["duration"] * SR)
    if len(track) < n:
        bar, fade = int(g["bar"] * SR), int(0.02 * SR)
        loop = (len(track) - fade) // bar * bar
        if loop <= 0:
            stop(f"{path.name} is shorter than one bar")
        print(f"  the track is {len(track) / SR:.1f} s: looping every {loop / SR:.2f} s ({loop // bar} bars)")
        ramp = np.linspace(0, 1, fade)[:, None]
        body = track[:loop].copy()
        body[:fade] = body[:fade] * ramp + track[loop:loop + fade] * (1 - ramp)  # the seam is a short crossfade
        track = np.concatenate([track[:loop], np.tile(body, (n // loop + 1, 1))])
    return track[:n].astype(np.float32)


def envelope(said, g, n, under_db, between_db, fade):
    """The music's gain in dB over the film: down before each line, up after it, out at the end."""
    t = np.arange(n) / SR
    env = np.full(n, between_db)
    for line in said:
        down = np.interp(t, [line["start"] - DUCK_DOWN, line["start"]], [between_db, under_db])
        up = np.interp(t, [line["end"], line["end"] + DUCK_UP], [under_db, between_db])
        env = np.minimum(env, np.where(t < line["end"], down, up))
    gain = 10 ** (env / 20)
    tail = np.clip((g["duration"] - t) / fade, 0, 1)
    return gain * tail * tail


def mix(folder, name, spec, g, said):
    voice = decode(folder / "narration.wav", 1)[:, 0]
    n = int(g["duration"] * SR)
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    out = np.repeat(voice[:, None], 2, axis=1)
    music = spec.get("music")
    track = (folder / music["file"]).resolve() if music else None
    if track and track.exists():
        bed = music_bed(track, g, float(music.get("offset", 0)))
        level = rms_db(voice) - rms_db(bed)  # the gain that puts the music at the voice's level
        under, between = level - float(music.get("duckDb", 16)), level - float(music.get("betweenDb", 5))
        out = out + bed * envelope(said, g, n, under, between, float(music.get("fadeSeconds", 2)))[:, None]
        print(f"  music: {track.name}, {music.get('duckDb', 16)} dB under the voice, {music.get('betweenDb', 5)} dB under it between lines")
    else:
        print("\n" + "!" * 78)
        why = f"{track} does not exist" if music else 'narration.json names no "music"'
        print(f"!!  Music: pending ({why}).")
        print("!!  This mix is the voice alone. Write \"Music: pending\" at the top of the video's README.md.")
        print("!" * 78 + "\n")
        track = None
    raw = folder / "mix.wav"
    write_wav(raw, out / max(1.0, float(np.abs(out).max())), SR)
    # One gain for the whole film (no pumping), then a limiter for the peaks.
    loudness = lufs(raw)
    mp3 = folder / f"{name}.mp3"
    ffmpeg("-loglevel", "error", "-i", raw, "-af", f"volume={-16 - loudness:.2f}dB,alimiter=limit=0.84:level=false",
           "-ar", SR, "-c:a", "libmp3lame", "-b:a", "192k", mp3)
    raw.unlink()
    print(f"wrote {mp3}  ({g['duration']:.2f} s, {lufs(mp3):.1f} LUFS)")
    return track


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--grid", action="store_true", help="write timing.js from the scene grid alone, without speaking")
    args = parser.parse_args()
    folder = args.folder.resolve()
    name = folder.name
    if not (folder / "narration.json").exists():
        stop(f"{folder / 'narration.json'} does not exist")
    spec = json.loads((folder / "narration.json").read_text(encoding="utf-8"))
    g = grid(spec)
    print(f"{name}: {g['bpm']:g} BPM, bar {g['bar']:.3f} s, {len(g['scenes'])} scenes, {g['duration']:.2f} s")

    said, cues, track = [], [], None
    if not args.grid:
        said = narrate(folder, spec, g)
        cues = captions(said)
        track = mix(folder, name, spec, g, said)
        (folder / "captions.vtt").write_text(
            "WEBVTT\n\n" + "\n".join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n" for c in cues), encoding="utf-8")
    timing = {
        "name": name, "audio": f"{name}.mp3", "voice": spec.get("voice", "af_heart"),
        "bpm": g["bpm"], "beatsPerBar": g["beatsPerBar"], "beat": round(g["beat"], 6), "bar": round(g["bar"], 6),
        "duration": round(g["duration"], 4), "music": track.name if track else None,
        "scenes": [{"id": s["id"], "start": s["start"], "length": s["length"], "bars": s["bars"]} for s in g["scenes"]],
        "lines": said, "captions": cues,
    }
    (folder / "timing.js").write_text(
        "// Generated by tools/video-audio/film_audio.py from narration.json. Do not edit.\n"
        f"window.FILM_TIMING = {json.dumps(timing, indent=1, ensure_ascii=False)};\n", encoding="utf-8")
    print(f"wrote {folder / 'timing.js'}" + ("" if args.grid else f" and {folder / 'captions.vtt'}"))


if __name__ == "__main__":
    main()
