import type { Locator, Page } from '@playwright/test';

type DeviceFile = { name: string; mimeType: string; buffer: Buffer };

/**
 * A photo in a thread, Everyone or a direct message (L2-026): "Photo" in the composer, the
 * photo preview above the field with "Remove photo", the refusal of a file Popkin does not take,
 * and the photo a message carries, which opens full screen.
 */
export class ChatPhotos {
  /** "Photo" in the composer. */
  readonly choose: Locator;
  /** The photo chosen, above the field. */
  readonly preview: Locator;
  readonly previewImage: Locator;
  readonly remove: Locator;
  /** Why a file was refused, with "Dismiss". */
  readonly refusal: Locator;
  readonly dismiss: Locator;

  constructor(private readonly page: Page) {
    const composer = page.locator('.composer');
    this.choose = composer.getByRole('button', { name: 'Photo', exact: true });
    this.preview = composer.locator('.composer__photo');
    this.previewImage = this.preview.getByRole('img');
    this.remove = composer.getByRole('button', { name: 'Remove photo' });
    this.refusal = composer.getByRole('alert');
    this.dismiss = this.refusal.getByRole('button', { name: 'Dismiss' });
  }

  /** Chooses "Photo" and picks this file on the device, as the picker would. */
  async pick(file: DeviceFile): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.choose.click();
    await (await chooser).setFiles(file);
  }

  /** The link that opens the photo a message carries full screen. */
  photo(message: Locator): Locator {
    return message.getByRole('link', { name: /^Open (your photo|photo from )/ });
  }

  /** "Photo removed", in place of a photo deleted since it was sent (L2-036 AC3). */
  removed(message: Locator): Locator {
    return message.getByText('Photo removed', { exact: true });
  }

  /** The picture itself, named by its alt text. */
  image(message: Locator): Locator {
    return this.photo(message).getByRole('img');
  }
}
