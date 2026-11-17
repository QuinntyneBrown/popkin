import type { Locator, Page } from '@playwright/test';

/** "Notifications", `/account/notifications` (L2-155). */
export class NotificationSettingsPage {
  readonly root: Locator;
  readonly heading: Locator;
  /** The top bar's back link, to the account. */
  readonly back: Locator;
  /** "Email me about activity" (L2-156). */
  readonly emailSection: Locator;
  readonly emailSwitch: Locator;
  readonly frequency: Locator;
  /** "Add an email to your account to get Popkin email." (L2-156 AC5). */
  readonly noEmail: Locator;
  /** The three groups of kinds, each a heading, a sentence and a matrix of switches. */
  readonly groups: Locator;
  /** "Always on", for "Sign-in codes and security" (L2-157 AC2). */
  readonly alwaysOn: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly yourAccount: Locator;
  /** The bar after email is switched off, and its actions (L2-156 AC3, AC4). */
  readonly undoBar: Locator;
  readonly turnEmailBackOn: Locator;
  readonly dismissBar: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly firstGroup: Locator;
  readonly firstMatrix: Locator;
  readonly accountMatrix: Locator;
  readonly optionGrid: Locator;
  readonly skeleton: Locator;
  readonly empty: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="notification-settings"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.topBar = page.locator('.topbar');
    this.back = this.topBar.getByRole('link', { name: 'Your account' });
    this.emailSection = page.locator('.settings-section').filter({
      has: page.getByRole('heading', { name: 'Email me about activity' }),
    });
    this.emailSwitch = page.getByRole('switch', { name: 'Email notifications' });
    this.frequency = page.getByRole('radiogroup', { name: 'Email me about activity' });
    this.optionGrid = this.frequency;
    this.noEmail = this.emailSection.getByText('Add an email to your account to get Popkin email.');
    this.groups = page.locator('.notif-group');
    this.firstGroup = this.groups.first();
    this.firstMatrix = page.locator('.notif-matrix').first();
    this.accountMatrix = page.locator('.notif-matrix').last();
    this.alwaysOn = page.locator('.notif-matrix__lock');
    this.loading = page
      .getByRole('status')
      .filter({ hasText: 'Loading your notification settings…' });
    this.skeleton = page.locator('.skeleton').first();
    this.empty = page.locator('.empty');
    this.error = page.getByRole('heading', { name: 'We couldn’t load your notification settings' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.yourAccount = this.empty.getByRole('link', { name: 'Your account' });
    this.undoBar = page.locator('.undo-bar');
    this.turnEmailBackOn = this.undoBar.getByRole('button', { name: 'Turn email back on' });
    this.dismissBar = this.undoBar.getByRole('button', { name: 'Dismiss' });
  }

  /** A group by its name: "When something changes", "Reminders" or "Your account". */
  group(name: string): Locator {
    return this.groups.filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  /** The switch of one kind on one channel: "Group chat by email", "Group chat on your phone". */
  kindSwitch(kind: string, channel: 'email' | 'phone'): Locator {
    const name = channel === 'email' ? `${kind} by email` : `${kind} on your phone`;
    return this.page.getByRole('switch', { name, exact: true });
  }

  frequencyOption(name: string): Locator {
    return this.frequency.getByRole('radio', { name: new RegExp(`^${name}`) });
  }
}
