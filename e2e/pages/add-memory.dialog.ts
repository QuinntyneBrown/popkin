import type { Locator, Page } from '@playwright/test';

/** Add to {first name}’s memories, from the profile’s Memories & files (L2-136). */
export class AddMemoryDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly whatToAdd: Locator;
  readonly choose: Locator;
  readonly fileInput: Locator;
  readonly fileHint: Locator;
  readonly fileError: Locator;
  readonly caption: Locator;
  readonly captionHint: Locator;
  readonly note: Locator;
  readonly noteHint: Locator;
  readonly summary: Locator;
  readonly upload: Locator;
  readonly uploadName: Locator;
  readonly uploadStatus: Locator;
  readonly progress: Locator;
  readonly save: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: /’s memories$/ });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.whatToAdd = this.root.getByRole('radiogroup', { name: 'What to add' });
    this.choose = this.root.locator('.add-card');
    this.fileInput = this.root.locator('input[type="file"]');
    this.fileHint = this.root.locator('.memory-chooser__hint');
    this.fileError = this.root.locator('.memory-chooser .field__error');
    this.caption = this.root.getByRole('textbox', { name: 'Caption' });
    this.captionHint = this.root.getByText('Optional. Only you can see it.', { exact: true });
    this.note = this.root.getByRole('textbox', { name: 'Note' });
    this.noteHint = this.root.getByText('Up to 2,000 characters. Only you can see it.', {
      exact: true,
    });
    this.summary = this.root.locator('.form-summary');
    this.upload = this.root.locator('.memory-upload');
    this.uploadName = this.upload.locator('.memory-upload__name');
    this.uploadStatus = this.upload.locator('.memory-upload__status');
    this.progress = this.root.getByRole('progressbar');
    this.save = this.root.locator('.dialog__footer').getByRole('button');
    this.failed = this.root.getByRole('alert').filter({ hasText: 'We couldn’t save it' });
  }

  option(name: 'Photo' | 'File' | 'Note'): Locator {
    return this.whatToAdd.getByRole('radio', { name });
  }
}
