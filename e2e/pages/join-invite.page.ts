import type { Locator, Page } from '@playwright/test';

/** The invite screen, `/i/:code` (L2-012, L2-016). */
export class JoinInvitePage {
  readonly root: Locator;
  readonly heading: Locator;
  /** Any element inside the heading: there is none when a name is shown as text. */
  readonly headingMarkup: Locator;
  readonly invitedBy: Locator;
  readonly tile: Locator;
  readonly mutedTile: Locator;
  readonly avatars: Locator;
  readonly moreAvatars: Locator;
  readonly people: Locator;
  readonly timeLeft: Locator;
  readonly join: Locator;
  readonly note: Locator;
  readonly loading: Locator;
  readonly wrappedLine: Locator;
  readonly startYourOwn: Locator;
  readonly problem: Locator;
  readonly problemHeading: Locator;
  readonly problemText: Locator;
  readonly startAPopkin: Locator;
  readonly joinWithACode: Locator;
  readonly tryAgain: Locator;
  readonly backToStart: Locator;
  readonly screen: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly wordmark: Locator;
  readonly preview: Locator;
  readonly avatarStack: Locator;
  readonly skeletons: Locator;
  /** The skeletons that assistive technology does not meet. */
  readonly hiddenSkeletons: Locator;
  readonly buttonSkeleton: Locator;
  /** The shapes that stand in for the invite while it loads. */
  readonly skeletonGroup: Locator;
  readonly emptyState: Locator;
  readonly primaryButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="join-invite"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.headingMarkup = this.heading.locator('*');
    this.invitedBy = page.locator('.pill');
    this.tile = page.getByRole('main').locator('.popkin-tile');
    this.mutedTile = page.locator('.popkin-tile--muted');
    this.avatarStack = page.locator('.avatar-stack');
    this.avatars = this.avatarStack.locator('.avatar');
    this.moreAvatars = page.locator('.avatar-stack__more');
    this.people = page.getByText(/^\d+ (person|people)$/);
    this.timeLeft = page.locator('.time-left');
    this.join = page.getByRole('link', { name: 'Join', exact: true });
    this.note = page.locator('.legal');
    this.loading = page.getByRole('main').getByRole('status');
    this.wrappedLine = page.locator('.lead');
    this.startYourOwn = page.getByRole('link', { name: 'Start your own Popkin' });
    this.problem = page.getByRole('alert');
    this.emptyState = page.locator('.empty');
    this.problemHeading = this.emptyState.getByRole('heading');
    this.problemText = this.emptyState.locator('p').first();
    this.startAPopkin = page.getByRole('link', { name: 'Start a Popkin' });
    this.joinWithACode = page.getByRole('link', { name: 'Join with a code' });
    this.tryAgain = page
      .getByRole('button', { name: 'Try again' })
      .or(page.getByRole('link', { name: 'Try again' }));
    this.backToStart = page.getByRole('link', { name: 'Back to start' });
    this.screen = page.locator('.screen');
    this.picture = page.getByRole('complementary', { name: 'Popkin' });
    this.wordmark = page.getByRole('main').locator('.wordmark');
    // The pill's parent is the block that holds the whole preview, in the mock and in the app.
    this.preview = this.invitedBy.locator('..');
    this.skeletons = page.locator('.skeleton');
    this.hiddenSkeletons = page.getByRole('main').locator('[aria-hidden="true"] .skeleton');
    this.skeletonGroup = page.locator('.skeleton--title').locator('..');
    this.buttonSkeleton = page.locator('.skeleton--btn');
    this.primaryButton = page.locator('.btn--popkin');
  }
}
