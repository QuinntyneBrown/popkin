import { expect, test } from '../fixtures/pk-test';
import { HomePage } from '../pages/home.page';

test('the app opens on its first screen', async ({ page, pk }) => {
  await pk.open('home');

  const home = new HomePage(page);
  await expect(home.root).toBeVisible();
  await expect(home.heading).toHaveText('Popkin');
});
