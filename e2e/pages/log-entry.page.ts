import type { Locator, Page } from '@playwright/test';

/** Log a conversation or milestone, `/contacts/people/:id/log` (L2-133, L2-134). */
export class LogEntryPage {
  readonly root: Locator;
  readonly topBar: Locator;
  readonly heading: Locator;
  readonly cancel: Locator;
  readonly save: Locator;
  readonly saving: Locator;
  readonly whatToLog: Locator;
  readonly channels: Locator;
  readonly when: Locator;
  readonly talk: Locator;
  readonly promiseSection: Locator;
  readonly promiseHint: Locator;
  readonly promises: Locator;
  readonly addPromise: Locator;
  readonly remembering: Locator;
  readonly addDate: Locator;
  readonly kinds: Locator;
  readonly what: Locator;
  readonly whenDay: Locator;
  readonly note: Locator;
  readonly everyYear: Locator;
  readonly yearlyHint: Locator;
  readonly summary: Locator;
  readonly summaryHeading: Locator;
  readonly summaryLinks: Locator;
  readonly alert: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly form: Locator;
  readonly kindGrid: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="log-entry"]');
    this.topBar = page.locator('.topbar');
    this.heading = page.getByRole('heading', { level: 1 });
    this.cancel = this.topBar.getByRole('link', { name: 'Cancel' });
    this.save = this.topBar.getByRole('button', { name: 'Save' });
    this.saving = this.topBar.getByRole('button', { name: 'Saving…' });
    this.form = page.locator('form.log-form, form#form');
    this.kindGrid = page.locator('.kind-grid');
    this.whatToLog = page.getByRole('tablist', { name: 'What to log' });
    this.channels = page.getByRole('radiogroup', { name: 'How you talked' });
    this.when = this.form.getByText(/^Today, /);
    this.talk = page.getByRole('textbox', { name: 'What did you talk about?' });
    this.promiseSection = page.getByRole('region', { name: 'Anything you said you’d do?' });
    this.promiseHint = this.promiseSection.locator('.log-section__hint');
    this.promises = this.promiseSection.locator('.promise');
    this.addPromise = page.getByRole('button', { name: 'Add a promise or follow-up' });
    this.remembering = page.getByRole('region', { name: 'Worth remembering' });
    this.addDate = this.remembering.getByRole('button', { name: 'Add a date' });
    this.kinds = page.getByRole('radiogroup', { name: 'What kind' });
    this.what = page.getByRole('textbox', { name: 'What happened?' });
    this.whenDay = page.getByLabel('When', { exact: true });
    this.note = page.getByRole('textbox', { name: 'Note' });
    this.everyYear = page.getByRole('switch', { name: 'Remember this every year' });
    this.yearlyHint = page.locator('.setting-row__sub');
    this.summary = page.locator('.form-summary');
    this.summaryHeading = this.summary.getByRole('heading');
    this.summaryLinks = this.summary.getByRole('link');
    this.alert = page.locator('.alert');
  }

  tab(name: 'Conversation' | 'Milestone'): Locator {
    return this.whatToLog.getByRole('tab', { name });
  }

  channel(name: string): Locator {
    return this.channels.getByRole('radio', { name });
  }

  kind(name: string): Locator {
    return this.kinds.getByRole('radio', { name });
  }

  removePromise(): Locator {
    return this.promiseSection.getByRole('button', { name: 'Remove this promise' });
  }

  error(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
