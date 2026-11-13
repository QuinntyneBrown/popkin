#!/usr/bin/env node
// Save the screenshots of a video: run <folder>/shots.ts in Chromium against the running app.
//
//   node tools/video-record/record.mjs docs/videos/NN-journey-JJ-topic
//
// Not a test and not a sweep (docs/videos/README.md): it compares nothing. The app on :4200 is
// reused when it is running and started otherwise; every /api request is answered by e2e's mocks.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const folder = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !fs.existsSync(path.join(folder, 'shots.ts'))) {
  console.error('usage: node tools/video-record/record.mjs <video folder with a shots.ts>');
  process.exit(2);
}
const modules = path.join(root, 'e2e', 'node_modules');
const env = { ...process.env, PK_VIDEO_DIR: folder, NODE_PATH: modules };
// The sweeps and the parity run are the owner's and CI's; this tool is neither.
for (const key of ['PK_SWEEPS', 'PK_BASELINE', 'PK_PARITY']) delete env[key];

const run = spawnSync(
  process.execPath,
  [path.join(modules, '@playwright', 'test', 'cli.js'), 'test', '-c', path.join(root, 'tools', 'video-record', 'playwright.config.ts'), '--trace', 'off'],
  { cwd: root, env, stdio: 'inherit' },
);
if (run.status === 0) {
  const shots = path.join(folder, 'shots');
  const saved = fs.existsSync(shots) ? fs.readdirSync(shots).filter((f) => f.endsWith('.png')) : [];
  console.log(`${saved.length} PNG in ${shots}`);
}
process.exit(run.status ?? 1);
