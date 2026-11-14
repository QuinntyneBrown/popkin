// Copies the marketing site's media into its public folder before it is served or built
// (ADR 0017): the pitch film from docs/videos and the pictures from the mocks. The copies are
// ignored by git. A film not rendered yet is skipped: the player still shows its still.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const site = join(root, 'frontend', 'projects', 'marketing', 'public');
const film = join(root, 'docs', 'videos', '19-meet-popkin', '19-meet-popkin.mp4');
const images = join(root, 'docs', 'mocks', 'assets', 'images');

mkdirSync(join(site, 'media'), { recursive: true });
mkdirSync(join(site, 'images'), { recursive: true });
if (existsSync(film)) {
  copyFileSync(film, join(site, 'media', 'meet-popkin.mp4'));
} else {
  console.warn(`media:sync: ${film} is not rendered yet; the film will not play.`);
}
for (const image of readdirSync(images).filter((name) => name.endsWith('.jpg'))) {
  copyFileSync(join(images, image), join(site, 'images', image));
}
