import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Saves the screenshots of a video (docs/videos/README.md, "Screenshots"). It is not a test run
 * and not a sweep: it borrows Playwright to open the running Angular app and save pictures of
 * it. The video folder's `shots.ts` says which states to open, with the fixtures and page objects
 * of `e2e/`, so every `/api/**` request is answered from the recording as in every spec
 * (ADR 0005). Nothing here sets PK_SWEEPS, PK_BASELINE or PK_PARITY, and neither `npm test`,
 * `npm run parity` nor CI reads this file. Run it with `node tools/video-record/record.mjs`.
 */
const folder = process.env['PK_VIDEO_DIR'];
if (!folder) throw new Error('Run this through tools/video-record/record.mjs <video folder>.');
const root = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: path.resolve(root, folder),
  testMatch: 'shots.ts',
  outputDir: path.resolve(root, '.cache', 'video-record'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'off',
  },
  // Chromium only (AGENTS.md). Double density, the phone window, the light theme and no motion
  // are the defaults; `frame(page, 'XL', 'dark')` in shots.ts changes the window and the theme.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 780 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
  webServer: [
    {
      command: `npm start --prefix "${path.resolve(root, 'frontend')}" -- --port 4200`,
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
