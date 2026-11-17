import type { Locator, Page } from '@playwright/test';

/** Add someone, `/contacts/people/new`, and Edit, `/contacts/people/:id/edit` (L2-129, L2-130). */
export class ContactFormPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly cancel: Locator;
  /** Edit's "Delete {first name}", after the form (L2-132). */
  readonly delete: Locator;
  readonly save: Locator;
  /** "How they connect" (L2-150 AC9). */
  readonly connections: Locator;
  /** "Groups": a toggle chip per group (L2-147 AC6). */
  readonly groups: Locator;
  readonly connectTo: Locator;
  readonly saving: Locator;
  readonly who: Locator;
  readonly details: Locator;
  readonly dates: Locator;
  readonly anotherDate: Locator;
  readonly dateEntries: Locator;
  readonly detailsHint: Locator;
  readonly addPhoto: Locator;
  /** Edit shows the photo they have as "Change photo" (L2-130 AC4). */
  readonly changePhoto: Locator;
  readonly photo: Locator;
  readonly name: Locator;
  readonly nameError: Locator;
  readonly knownAs: Locator;
  readonly circle: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly city: Locator;
  readonly howWeMet: Locator;
  readonly loves: Locator;
  readonly summary: Locator;
  readonly summaryHeading: Locator;
  readonly summaryLinks: Locator;
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly sections: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="add-contact"]');
    this.topBar = page.locator('.topbar');
    this.heading = page.getByRole('heading', { level: 1 });
    this.cancel = this.topBar.getByRole('link', { name: 'Cancel' });
    this.delete = page.locator('.menu-list--separated').getByRole('button', { name: /^Delete / });
    this.save = this.topBar.getByRole('button', { name: 'Save' });
    this.connections = page
      .getByRole('region', { name: 'How they connect' })
      .or(page.locator('section').filter({ hasText: 'How they connect' }))
      .locator('.person-pick');
    this.groups = page.getByRole('group', { name: 'Groups' });
    this.connectTo = page
      .getByRole('button', { name: 'Connect to someone' })
      .or(page.getByRole('link', { name: 'Connect to someone' }));
    this.saving = this.topBar.getByRole('button', { name: 'Saving…' });
    this.sections = page.locator('.form-sections');
    this.who = page.getByRole('region', { name: 'Who' });
    this.details = page.getByRole('region', { name: 'Details' });
    this.dates = page.getByRole('region', { name: 'Dates to remember' });
    this.anotherDate = this.dates.getByRole('button', { name: 'Another date' });
    this.dateEntries = this.dates.locator('.date-entry');
    this.detailsHint = this.details.locator('.form-section__hint');
    this.addPhoto = page.getByRole('button', { name: 'Add a photo' });
    this.changePhoto = page.getByRole('button', { name: 'Change photo' });
    this.photo = this.who.locator('.avatar img');
    this.name = page.getByRole('textbox', { name: 'Name' });
    this.nameError = page.locator('#name-err');
    this.knownAs = page.getByRole('textbox', { name: 'How you know them' });
    this.circle = page.getByRole('radiogroup', { name: 'Circle' });
    this.phone = page.getByRole('textbox', { name: 'Phone' });
    this.email = page.getByRole('textbox', { name: 'Email' });
    this.city = page.getByRole('textbox', { name: 'City' });
    this.howWeMet = page.getByRole('textbox', { name: 'How you met' });
    this.loves = page.getByRole('textbox', { name: 'Things they love' });
    this.summary = page.locator('.form-summary');
    this.summaryHeading = this.summary.getByRole('heading');
    this.summaryLinks = this.summary.getByRole('link');
    this.failed = page.locator('.banner');
  }

  circleChoice(name: string): Locator {
    return this.circle.getByRole('radio', { name });
  }

  /** "Remind me about the birthday". */
  remindAbout(kind: string): Locator {
    return this.dates.getByRole('combobox', { name: `Remind me about the ${kind}` });
  }

  /** "Remove the birthday". */
  removeDate(kind: string): Locator {
    return this.dates.getByRole('button', { name: `Remove the ${kind}` });
  }

  group(name: string): Locator {
    return this.groups.getByRole('button', { name });
  }
}
