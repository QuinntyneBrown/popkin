# video-record

Saves a video's screenshots: runs the folder's `shots.ts` in Chromium against the running app and
writes PNGs at double density into the folder's `shots/`. Standard: `docs/videos/README.md`,
"Screenshots".

```
node tools/video-record/record.mjs docs/videos/NN-journey-JJ-topic
```

It is not a test and not a sweep. It has its own Playwright config (`playwright.config.ts` here,
matching only `shots.ts` in the given folder), compares nothing, clears `PK_SWEEPS`, `PK_BASELINE`
and `PK_PARITY`, and is not run by `npm test`, `npm run parity` or CI. The app on `:4200` is reused
when it is running and started (then stopped) otherwise. Every `/api/**` request is answered by the
`page` fixture of `e2e/fixtures/pk-test.ts`, as in every spec (ADR 0005).

## Writing `shots.ts`

```ts
import { test } from '../../../e2e/fixtures/pk-test';
import { SignUpPage } from '../../../e2e/pages/sign-up.page';
import { detail, frame, shot } from '../../../tools/video-record/shots';

test('sign up', async ({ page, pk }) => {
  await frame(page, 'XS'); // 390×780, light
  await pk.open('signUp'); // a key of e2e/fixtures/routes.ts
  await shot(page, 'sign-up-xs'); // shots/sign-up-xs.png
  await frame(page, 'XL'); // 1440×900
  await pk.open('signUp');
  await shot(page, 'sign-up-xl');
  await detail(new SignUpPage(page).primaryButton, 'sign-up-continue', 24); // a close-up
  await frame(page, 'XS', 'dark');
  await pk.open('signUp');
  await shot(page, 'sign-up-xs-dark');
});
```

| Helper | What it does |
|--------|--------------|
| `frame(page, size, theme = 'light')` | Sets the window (`'XS'` 390×780, `'M'` 768×1024, `'L'` 1024×768, `'XL'` 1440×900) and the theme, with reduced motion. Call it before opening a state. |
| `shot(page, name)` | Saves the window as `shots/<name>.png`, once the fonts have settled, with animations disabled and the caret hidden. |
| `detail(locator, name, pad = 16)` | Saves one region with `pad` CSS pixels of air around it: the close-up of a scene. |
| `bringToTop(locator, offset = 96)` | Scrolls a region to the top of the window before a shot. |
| `SIZES`, `shotsDir` | The four windows, and where the pictures go. |

Selectors stay in the page objects of `e2e/pages/`; `shots.ts` names regions, as a spec does.
