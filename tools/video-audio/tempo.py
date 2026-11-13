#!/usr/bin/env python3
"""Measure a track's tempo, so a film's grid can be set to it.

    python tools/video-audio/tempo.py docs/videos/assets/music/<slug>.mp3 [--min 80] [--max 180]

Prints the BPM, the length of a beat and of a 4/4 bar, the time of the first beat (the "offset" for
narration.json, so bar 1 of the film falls on a beat) and how many whole bars the track holds.
The method is plain: the onset strength of the track (rise in spectral energy, 100 frames a second),
autocorrelated, the strongest lag between --min and --max BPM. Check the answer by ear: a track
may read as half or double its tempo. Needs numpy and ffmpeg (FFMPEG_PATH overrides).
"""
import argparse, os, subprocess, sys

import numpy as np

SR, HOP, WIN = 22050, 220, 1024  # 100.2 onset frames a second


def onsets(path):
    run = subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         capture_output=True)
    if run.returncode != 0:
        sys.exit(f"tempo: ffmpeg could not read {path}: {run.stderr.decode(errors='replace')[-300:]}")
    x = np.frombuffer(run.stdout, dtype="<f4")
    frames = np.lib.stride_tricks.sliding_window_view(x, WIN)[::HOP]
    spectrum = np.log1p(100 * np.abs(np.fft.rfft(frames * np.hanning(WIN), axis=1)))
    flux = np.maximum(0, np.diff(spectrum, axis=0)).sum(axis=1)
    return flux - flux.mean(), len(x) / SR


def measure(path, lo=80, hi=180):
    flux, seconds = onsets(path)
    rate = SR / HOP
    spectrum = np.fft.rfft(flux, 2 * len(flux))
    auto = np.fft.irfft(spectrum * np.conj(spectrum))[: len(flux)]
    lags = np.arange(int(rate * 60 / hi), int(rate * 60 / lo) + 1)
    # A beat's lag also shows at twice and four times its length; adding them steadies the pick.
    score = auto[lags] + 0.5 * auto[lags * 2] + 0.25 * auto[lags * 4]
    best = int(lags[np.argmax(score)])
    # Refine below one frame: the lag that best lines up 16 beats.
    fine = np.linspace(best - 1, best + 1, 201)
    best = float(fine[np.argmax([np.interp(np.arange(1, 17) * lag, np.arange(len(auto)), auto).sum() for lag in fine])])
    bpm = 60 * rate / best
    # The first beat: the phase at which a comb of beats collects the most onset strength.
    phases = np.arange(0, best, 0.25)
    comb = [np.interp(np.arange(phase, len(flux) - 1, best), np.arange(len(flux)), flux).mean() for phase in phases]
    # An onset shows one hop and half a window before the sound that causes it.
    first = (float(phases[int(np.argmax(comb))]) * HOP + HOP + WIN / 2) / SR
    return bpm, first % (60 / bpm), seconds


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("track")
    parser.add_argument("--min", type=float, default=80)
    parser.add_argument("--max", type=float, default=180)
    args = parser.parse_args()
    bpm, first, seconds = measure(args.track, args.min, args.max)
    beat = 60 / bpm
    print(f"{args.track}")
    print(f"  tempo       {bpm:.2f} BPM  (use {round(bpm)} if the track was made on a grid)")
    print(f"  beat        {beat:.4f} s    bar (4/4) {beat * 4:.4f} s")
    print(f"  first beat  {first:.3f} s   (\"offset\" in narration.json; add whole beats to start on the downbeat)")
    print(f"  length      {seconds:.2f} s = {int((seconds - first) / (beat * 4))} whole bars")
