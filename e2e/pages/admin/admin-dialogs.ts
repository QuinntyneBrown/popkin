import type { Locator, Page } from '@playwright/test';

/** "Add an admin" (L2-119 AC2, AC3): a staff email and a role. */
export class AddAdminDialog {
  readonly dialog: Locator;
  /** The frame `pk-dialog` draws; the CDK container around it has no size of its own. */
  readonly panel: Locator;
  readonly email: Locator;
  readonly emailError: Locator;
  readonly roles: Locator;
  readonly sendInvite: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Add an admin' });
    this.panel = this.dialog.locator('.dialog__panel');
    this.email = this.dialog.getByLabel('Staff email');
    this.emailError = this.dialog.locator('#staff-err');
    this.roles = this.dialog.getByRole('radiogroup', { name: 'Role' });
    this.sendInvite = this.dialog.getByRole('button', { name: /Send invite|Sending/ });
    this.cancel = this.dialog.getByRole('button', { name: 'Cancel' });
    this.alert = this.dialog.locator('.alert');
  }

  role(name: 'Owner' | 'Support' | 'Viewer'): Locator {
    return this.roles.getByRole('radio', { name: new RegExp(`^${name}`) });
  }
}

/** "Make Aiko Tanaka a Viewer?" and "Remove Marco Bianchi?": an action with an optional reason. */
export class AdminActionDialog {
  readonly dialog: Locator;
  readonly panel: Locator;
  readonly description: Locator;
  readonly reason: Locator;
  readonly reasonField: Locator;
  readonly confirm: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(page: Page, heading: string, confirm: RegExp) {
    this.dialog = page.getByRole('dialog', { name: heading });
    this.panel = this.dialog.locator('.dialog__panel');
    this.description = this.dialog.locator('#dlg-desc');
    this.reason = this.dialog.getByLabel(/Reason, for the audit log/);
    this.reasonField = this.dialog.locator('.field');
    this.confirm = this.dialog.getByRole('button', { name: confirm });
    this.cancel = this.dialog.getByRole('button', { name: 'Cancel' });
    this.alert = this.dialog.locator('.alert');
  }
}
