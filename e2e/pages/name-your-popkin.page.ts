import type { Locator, Page } from '@playwright/test';

/** Name your Popkin, `/new` (L2-008). */
export class NameYourPopkinPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly name: Locator;
  readonly count: Locator;
  readonly preview: Locator;
  readonly emoji: Locator;
  readonly colours: Locator;
  readonly looksGood: Locator;
  readonly back: Locator;
  readonly screen: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly previewRow: Locator;
  readonly emojiGrid: Locator;
  readonly swatches: Locator;
  readonly footerButton: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;
  readonly previewCard: Locator;
  readonly previewName: Locator;
  readonly previewTile: Locator;
  readonly previewHost: Locator;
  readonly previewAvatar: Locator;
  readonly previewTimeLeft: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="name-your-popkin"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.name = page.getByRole('textbox', { name: 'Popkin name' });
    this.count = page.locator('.field__count');
    this.preview = page.locator('.preview-row .popkin-tile');
    this.emoji = page.getByRole('group', { name: 'Emoji' }).getByRole('button');
    this.colours = page.getByRole('group', { name: 'Colour' }).getByRole('button');
    this.looksGood = page.getByRole('button', { name: 'Looks good' });
    this.back = page.getByRole('link', { name: 'Back' });
    this.screen = page.locator('.screen');
    this.previewRow = page.locator('.preview-row');
    this.emojiGrid = page.locator('.emoji-grid');
    this.swatches = page.locator('.swatches');
    this.footerButton = page.locator('.screen__footer .btn');
    this.picture = page.getByRole('complementary', { name: 'Preview' });
    this.previewCard = page.locator('.preview-card');
    this.previewName = page.locator('.preview-card .popkin-card__name');
    this.previewTile = page.locator('.preview-card .popkin-tile');
    this.previewHost = page.locator('.preview-card .popkin-card__foot');
    this.previewAvatar = page.locator('.preview-card .avatar');
    this.previewTimeLeft = page.locator('.preview-card .time-left');
  }

  emojiNamed(label: string): Locator {
    return this.page.getByRole('group', { name: 'Emoji' }).getByRole('button', { name: label });
  }

  colour(label: string): Locator {
    return this.page.getByRole('group', { name: 'Colour' }).getByRole('button', { name: label });
  }

  /** Lakeside Weekend, camping, Teal: the Popkin the mocks show. */
  async chooseLakeside(): Promise<void> {
    await this.name.fill('Lakeside Weekend');
    await this.emojiNamed('Camping').click();
    await this.colour('Teal').click();
  }
}
