#!/usr/bin/env node
// Render a film from a video folder (slides.html + film.js, timing.js, NN-topic.mp3).
//
//   node tools/video-build/build.mjs docs/videos/NN-topic --check                print the schedule and how each line fits
//   node tools/video-build/build.mjs docs/videos/NN-topic --frame 12.5 out.png   save one frame (film seconds)
//   node tools/video-build/build.mjs docs/videos/NN-topic [--captions]           NN-topic.mp4 (1920×1080, 30 fps)
//   ... [--crf 21]                                                               quality (20 to 23)
//
// The build seeks the deck frame by frame with window.seek and muxes the frames with NN-topic.mp3,
// which tools/video-audio/film_audio.py writes first. Nothing is burned into the picture unless
// --captions is passed. Needs Node, Playwright with Chromium (NODE_PATH=e2e/node_modules; found
// there without it too) and ffmpeg with libx264 (FFMPEG_PATH overrides). Standard: docs/videos/README.md.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [...(process.env.NODE_PATH ?? '').split(path.delimiter).filter(Boolean), path.join(root, 'e2e', 'node_modules')] }));
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FPS = 30;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const CRF = flag('--crf') ? +args[args.indexOf('--crf') + 1] : 21;
const folder = path.resolve(args[0] ?? '');
const name = path.basename(folder);
if (!args[0] || !fs.existsSync(path.join(folder, 'slides.html'))) {
  console.error('usage: build.mjs <video folder> [--check | --frame <seconds> <png>] [--captions] [--crf <n>]');
  process.exit(2);
}

const stamp = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// Open the deck, wait for its fonts and pictures, and stop on anything it reports: a film drawn in
// a fallback face or with a missing screenshot is never encoded.
let browser;
async function open() {
  await browser?.close().catch(() => {});
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', (e) => failures.push(`script error: ${e.message}`));
  page.on('requestfailed', (r) => failures.push(`could not load ${r.url()}`));
  await page.goto(`${pathToFileURL(path.join(folder, 'slides.html'))}?render=1${flag('--captions') ? '&captions=1' : ''}`, { waitUntil: 'load' });
  if (!(await page.evaluate(() => typeof window.seek === 'function' && !!window.filmReady))) {
    throw new Error(['slides.html did not start the film (window.seek and window.filmReady are missing)', ...failures].join('\n  '));
  }
  await page.evaluate(() => window.filmReady);
  failures.push(...(await page.evaluate(() => window.filmErrors)));
  if (failures.length) throw new Error(`the deck is not ready:\n  ${[...new Set(failures)].join('\n  ')}`);
  // After the film is ready, a script error is a frame that would be wrong.
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => { console.error(`script error while drawing: ${e.message}`); process.exit(1); });
  return page;
}

try {
  let page = await open();
  const film = await page.evaluate(() => ({ duration: window.filmDuration, timing: window.Film.timing }));

  if (flag('--frame')) {
    const at = args.indexOf('--frame');
    const png = path.resolve(args[at + 2] ?? '');
    if (!(+args[at + 1] >= 0) || !args[at + 2]) throw new Error('--frame takes film seconds and a PNG path');
    await page.evaluate((t) => window.seek(t), +args[at + 1]);
    await page.screenshot({ path: png });
    console.log(`wrote ${png} (film ${stamp(+args[at + 1])})`);
  } else if (flag('--check')) {
    const { timing } = film;
    console.log(`${name}: ${timing.bpm} BPM, bar ${timing.bar.toFixed(3)} s, voice ${timing.voice}, music ${timing.music ?? 'PENDING'}`);
    for (const s of timing.scenes) {
      console.log(`${stamp(s.start)}  ${s.length.toFixed(2).padStart(6)} s  ${s.bars == null ? '' : `${s.bars} bars  `}${s.id}`);
      for (const l of timing.lines.filter((x) => x.scene === s.id)) {
        const spare = l.window[1] - l.end;
        console.log(`    ${stamp(l.start)}–${stamp(l.end)}  x${l.speed.toFixed(2)}  ${spare.toFixed(2)} s spare  ${l.text}`);
      }
    }
    if (!timing.lines.length) console.log('  no lines are timed yet: timing.js was written with --grid');
    console.log(`total ${film.duration.toFixed(2)} s, ${Math.round(film.duration * FPS)} frames at ${FPS} fps`);
  } else {
    const mp3 = path.join(folder, `${name}.mp3`);
    if (!fs.existsSync(mp3)) throw new Error(`${mp3} is missing: run tools/video-audio/film_audio.py first`);

    // Seek the deck frame by frame and pipe the screenshots to ffmpeg; no frame touches the disk.
    // Every draw is synchronous, so a frame is complete as soon as seek returns. The browser is
    // reopened every 600 frames, and after a crash, so a long render cannot run it out of memory.
    const mp4 = path.join(folder, `${name}.mp4`);
    const partial = path.join(folder, `${name}.partial.mp4`);
    const ffmpeg = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
      '-i', mp3, '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', '-t', String(film.duration), partial],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    let ended = null;
    ffmpeg.on('close', (code) => { ended = code; });
    ffmpeg.stdin.on('error', () => {}); // reported below, as ffmpeg's exit code
    const frames = Math.round(film.duration * FPS);
    for (let i = 0, retries = 0; i < frames; i++) {
      if (ended !== null) throw new Error(`ffmpeg stopped early (exit ${ended})`);
      let jpeg;
      try {
        if (i && i % 600 === 0) page = await open();
        await page.evaluate((t) => window.seek(t), i / FPS);
        jpeg = await page.screenshot({ type: 'jpeg', quality: 98 });
      } catch (e) {
        if (++retries > 20) throw e;
        console.log(`frame ${i}: the browser stopped (${String(e.message).slice(0, 80)}); reopening`);
        page = await open();
        i--;
        continue;
      }
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, 'drain');
      if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
    }
    ffmpeg.stdin.end();
    if (ended === null) await once(ffmpeg, 'close');
    if (ended !== 0) throw new Error(`ffmpeg failed (exit ${ended}); ${partial} is left for inspection`);
    fs.renameSync(partial, mp4);
    console.log(`wrote ${mp4}  (${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB${flag('--captions') ? ', captions burned in' : ''})`);
  }
} catch (e) {
  console.error(`build: ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
}
