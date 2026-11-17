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
  /** The views of the screen: "What you hear about", "Popkins" (L2-155 AC1). */
  readonly views: Locator;
  /** The Popkins view: one row per active Popkin (L2-158 AC1). */
  readonly popkinRows: Locator;
  /** "Undo" on the bar after a Popkin is muted (L2-158 AC4). */
  readonly undo: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly firstGroup: Locator;
  readonly firstMatrix: Locator;
  readonly accountMatrix: Locator;
  readonly optionGrid: Locator;
  readonly skeleton: Locator;
  readonly empty: Locator;
  readonly settingList: Locator;
  readonly firstLevels: Locator;

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
    this.views = page.getByRole('navigation', { name: 'Notification settings' });
    this.settingList = page.locator('.setting-list');
    this.firstLevels = page.locator('.segmented--levels').first();
    this.popkinRows = this.settingList.locator('.setting-list__item');
    this.undo = this.undoBar.getByRole('button', { name: 'Undo' });
  }

  /** A view's link: "What you hear about" or "Popkins". */
  view(name: string): Locator {
    return this.views.getByRole('link', { name, exact: true });
  }

  /** One Popkin's row on the Popkins view. */
  popkinRow(name: string): Locator {
    return this.popkinRows.filter({ hasText: name });
  }

  /** One Popkin's three levels, a radio group. */
  levels(name: string): Locator {
    return this.page.getByRole('radiogroup', { name: `How much you hear from ${name}` });
  }

  /** Lakeside Weekend muted, as `muted.html` draws it. */
  async muteLakeside(): Promise<void> {
    await this.level('Lakeside Weekend', 'Muted').click();
    await this.page.mouse.move(0, 0);
  }

  level(popkin: string, level: string): Locator {
    return this.levels(popkin).getByRole('radio', { name: level, exact: true });
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
