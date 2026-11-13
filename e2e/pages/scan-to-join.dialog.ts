import type { Locator, Page } from '@playwright/test';

/** "Scan to join": the camera, a frame for the QR code, and what was read (L2-015 AC1 to AC4). */
export class ScanToJoinDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly scanner: Locator;
  readonly camera: Locator;
  readonly frame: Locator;
  readonly hint: Locator;
  readonly alert: Locator;
  readonly typeTheCode: Locator;
  readonly tryTheCamera: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly panel: Locator;
  readonly header: Locator;
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Scan to join' });
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.scanner = this.root.locator('.scanner');
    this.camera = this.root.locator('.scanner__video');
    this.frame = this.root.locator('.scanner__frame');
    this.hint = this.root.locator('.scanner__hint');
    this.alert = this.root.getByRole('alert');
    this.typeTheCode = this.root.getByRole('link', { name: 'Type the code instead' });
    this.tryTheCamera = this.root.getByRole('button', { name: 'Try the camera again' });
    this.panel = this.root.locator('.dialog__panel');
    this.header = this.root.locator('.dialog__header');
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
  }
}
