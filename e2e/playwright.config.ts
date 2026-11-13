import { defineConfig, devices } from '@playwright/test';

/**
 * One suite, two targets (AGENTS.md):
 * - default: the Angular app on :4200. It never reaches the API: every /api request is answered
 *   from fixtures/api/responses.json by Playwright API mocking (ADR 0005);
 * - PK_BASELINE=1: the static design reference in docs/mocks, served on :4300, used to render
 *   the visual baselines the app is then compared with (ADR 0003).
 *
 * - PK_PARITY (`npm run parity`, ADR 0008): the component parity specs of tests/parity/ and
 *   nothing else. `mocks` renders their baselines from docs/mocks; `app` compares the app with
 *   them.
 *
 * ADR 0006: only the behaviour specs run. The sweeps (visual parity, responsive fit, automated
 * accessibility) are kept and maintained but run only when the repository owner runs
 * `npm run sweeps` by hand, which sets PK_SWEEPS=1.
 */
const parity = process.env['PK_PARITY'] as 'mocks' | 'app' | undefined;
const baseline = process.env['PK_BASELINE'] === '1';
// The mocks are the target: the sweeps' baseline render, or the parity specs' one.
const mocks = baseline || parity === 'mocks';
const ci = !!process.env['CI'];
const sweeps = process.env['PK_SWEEPS'] === '1' || baseline;
const sweepSpecs = ['visual/**/*.spec.ts', 'responsive.spec.ts', 'accessibility.spec.ts'];
const paritySpecs = 'parity/**/*.spec.ts';

const mocksServer = {
  command: 'npx http-server ../docs -p 4300 -c-1 --silent',
  url: 'http://localhost:4300/mocks/index.html',
  reuseExistingServer: !ci,
};

const appServer = {
  command: 'npm start --prefix ../frontend -- --port 4200',
  url: 'http://localhost:4200',
  reuseExistingServer: !ci,
  timeout: 240_000,
};

export default defineConfig({
  testDir: './tests',
  // Baseline runs only render the mocks; behaviour specs need the app.
  testMatch: parity ? paritySpecs : baseline ? 'visual/**/*.spec.ts' : '**/*.spec.ts',
  // The parity specs run under `npm run parity` only, the sweeps under `npm run sweeps` only.
  testIgnore: parity ? [] : sweeps ? [paritySpecs] : [paritySpecs, ...sweepSpecs],
  fullyParallel: true,
  // A few workers: each runs a browser, and the app's dev server shares the machine.
  workers: ci ? 2 : 3,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/../__baselines__/{arg}{ext}',
  expect: {
    // ADR 0003: mock and app are rendered by the same browser on the same machine, so only
    // sub-pixel text differences are tolerated.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: mocks ? 'http://localhost:4300/mocks/' : 'http://localhost:4200',
    trace: 'off',
  },
  // Chromium only (AGENTS.md).
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            // A call measures sound from the moment it opens, with no press before it.
            '--autoplay-policy=no-user-gesture-required',
            // Parity compares pixels: without this flag Chromium draws text with coloured (LCD)
            // edges on some layers and grey edges on others.
            ...(parity ? ['--disable-lcd-text'] : []),
          ],
        },
      },
    },
  ],
  webServer: mocks ? [mocksServer] : [appServer],
});
