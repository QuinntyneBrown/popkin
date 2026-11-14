import { expect, test } from '../fixtures/pk-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// Traces to: L2-079
test.describe('The marketing home page', () => {
  // AC1
  test('shows the navigation, the hero, the film and the landing page’s sections, in order', async ({
    page,
    pk,
  }) => {
    await pk.open('marketingHome');
    const site = new MarketingHomePage(page);

    await expect(site.root).toBeVisible();
    await expect(site.logo).toBeVisible();
    await expect(site.navStart).toHaveText('Start a Popkin');
    await expect(site.heroHeading).toHaveText('Your people, popped up in seconds.');
    await expect(site.sectionHeadings).toHaveText([
      'See Popkin in action.',
      'Scan. Join. You’re in.',
      'For every group that forms around a table.',
      'Better than a group chat.',
      'Free. Like, actually free.',
    ]);
    await expect(site.footer).toBeVisible();
  });
});
