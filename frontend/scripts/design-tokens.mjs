// Keeps the components library's copy of the design system's tokens and fonts current
// (ADR 0002). `sync` copies them; `check` fails when the copy differs from the source.
import { copyFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const source = join(root, 'docs', 'design-system');
const target = join(root, 'frontend', 'projects', 'components', 'src', 'lib', 'styles');
const fonts = readdirSync(join(source, 'assets', 'fonts')).filter((f) => f.endsWith('.woff2'));
const files = [
  ['tokens/tokens.css', 'tokens/tokens.css'],
  ...fonts.map((font) => [`assets/fonts/${font}`, `assets/fonts/${font}`]),
];

const mode = process.argv[2];
let stale = 0;
for (const [from, to] of files) {
  const a = join(source, from);
  const b = join(target, to);
  if (mode === 'sync') {
    copyFileSync(a, b);
    continue;
  }
  let same = false;
  try {
    same = readFileSync(a).equals(readFileSync(b));
  } catch {
    same = false;
  }
  if (!same) {
    console.error(`${to} differs from docs/design-system/${from}. Run npm run design:sync.`);
    stale++;
  }
}
process.exit(stale ? 1 : 0);
