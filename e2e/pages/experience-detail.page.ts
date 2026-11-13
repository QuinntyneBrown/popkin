import type { Locator, Page } from '@playwright/test';

/** One experience, `/p/:popkinId/experiences/:experienceId` (L2-038, L2-039, L2-041). */
export class ExperienceDetailPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly detail: Locator;
  /** The picture and the words under it; beside the rest from 1024 px. */
  readonly lead: Locator;
  readonly rest: Locator;
  readonly picture: Locator;
  readonly back: Locator;
  readonly intro: Locator;
  readonly kind: Locator;
  readonly title: Locator;
  readonly sharedBy: Locator;
  readonly place: Locator;
  readonly scoreCard: Locator;
  readonly average: Locator;
  /** The stars of the score, one image named "4.8 out of 5". */
  readonly stars: Locator;
  readonly count: Locator;
  readonly bars: Locator;
  readonly meters: Locator;
  readonly ratingPanel: Locator;
  readonly ratingHeading: Locator;
  readonly starButtons: Locator;
  readonly checkedStars: Locator;
  readonly addComment: Locator;
  readonly editComment: Locator;
  readonly comments: Locator;
  readonly commentsHeading: Locator;
  readonly commentRows: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly errorHeading: Locator;
  readonly tryAgain: Locator;
  readonly backToExperiences: Locator;
  readonly nav: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly cards: Locator;
  readonly starGroup: Locator;
  readonly firstComment: Locator;
  readonly introSkeleton: Locator;
  readonly bar: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="experience-detail"]');
    this.screen = page.locator('.screen');
    this.detail = page.locator('.detail');
    this.lead = this.detail.locator('.detail__lead');
    this.rest = this.detail.locator('.detail__rest');
    this.picture = this.lead.locator('.hero-media');
    this.back = page.getByRole('link', { name: 'Back', exact: true });
    this.intro = this.lead.locator('.detail__intro');
    this.title = page.getByRole('heading', { level: 1 });
    this.kind = this.intro.locator('p').first();
    this.sharedBy = this.intro.getByText(/^Shared by /);
    this.place = this.intro.locator('.icon').locator('..');
    this.cards = this.rest.locator('.detail__cards');
    this.scoreCard = this.rest.locator('.score-card');
    this.average = this.scoreCard.locator('.score-card__value');
    this.stars = this.scoreCard.getByRole('img');
    this.count = this.scoreCard.locator('.score-card__count');
    this.bars = this.scoreCard.getByRole('list', { name: 'Ratings by stars' });
    this.meters = this.bars.locator('.meter');
    this.ratingPanel = this.rest.locator('.card--tint');
    this.ratingHeading = this.ratingPanel.getByRole('heading', { level: 2 });
    this.starGroup = this.ratingPanel.getByRole('radiogroup');
    this.starButtons = this.starGroup.getByRole('radio');
    this.checkedStars = this.starGroup.locator('[aria-checked="true"]');
    this.addComment = this.ratingPanel.locator('.btn', { hasText: 'Add a comment' });
    this.editComment = this.ratingPanel.locator('.btn', { hasText: 'Edit your comment' });
    this.commentsHeading = this.rest.getByRole('heading', { name: 'What people said' });
    this.comments = this.rest.locator('.divided');
    this.commentRows = this.comments.locator('.comment');
    this.firstComment = this.commentRows.first();
    this.loading = this.detail.getByRole('status');
    this.introSkeleton = this.intro.locator('[aria-hidden="true"]').first();
    this.skeletons = this.detail.locator('.skeleton');
    this.bar = page.locator('.topbar');
    this.error = page.getByRole('alert');
    this.errorHeading = this.error.getByRole('heading');
    this.tryAgain = this.error.locator('.btn', { hasText: 'Try again' });
    this.backToExperiences = this.error.locator('.btn', { hasText: 'Back to Experiences' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
  }

  /** One of the five star buttons, by how many stars it gives. */
  star(stars: 1 | 2 | 3 | 4 | 5): Locator {
    return this.starGroup.getByRole('radio', { name: stars === 1 ? '1 star' : `${stars} stars` });
  }

  /** What a member said, by their first name. */
  commentBy(name: string): Locator {
    return this.commentRows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The bars as assistive technology hears them: "5 stars: 9 ratings", … */
  async barsInWords(): Promise<string[]> {
    return this.bars.locator('.visually-hidden').allTextContents();
  }

  /** Whether the lead sits beside the rest, as it does from 1024 px. */
  async sideBySide(): Promise<boolean> {
    const [lead, rest] = await Promise.all([this.lead.boundingBox(), this.rest.boundingBox()]);
    return !!lead && !!rest && rest.x >= lead.x + lead.width;
  }
}
