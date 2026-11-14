import type { Locator, Page } from '@playwright/test';

/**
 * What a member does to one message of a thread, in Everyone or a direct message: its reaction
 * chips, its quote, opening its actions, and the reply bar above the field (L2-024, L2-025).
 */
export class MessageActions {
  /** "Replying to Ruth", one line of her message, and "Cancel reply". */
  readonly replyBar: Locator;
  readonly replyingTo: Locator;
  readonly replySnippet: Locator;
  readonly cancelReply: Locator;

  constructor(private readonly page: Page) {
    const composer = page.locator('.composer');
    this.replyBar = composer.locator('.composer__reply');
    this.replyingTo = this.replyBar.locator('strong');
    this.replySnippet = this.replyBar.locator('.composer__reply-text');
    this.cancelReply = this.replyBar.getByRole('button', { name: 'Cancel reply' });
  }

  /** The chips under a message, in the order shown. */
  chips(message: Locator): Locator {
    return message.locator('.reaction');
  }

  /** The chip whose name starts with the emoji's name: "Heart" finds "Heart, you reacted, 3". */
  chip(message: Locator, name: string): Locator {
    return this.chips(message).and(
      this.page.getByRole('button', { name: new RegExp(`^${name}, `) }),
    );
  }

  /** What assistive technology reads for each chip under a message, in the order shown. */
  async chipNames(message: Locator): Promise<string[]> {
    return this.chips(message).evaluateAll((chips) =>
      chips.map((chip) =>
        // A chip that is not a button says its name in visually hidden text.
        (
          chip.getAttribute('aria-label') ??
          chip.querySelector('.visually-hidden')?.textContent ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    );
  }

  /** The quote a reply carries: a button to the message, or "Message deleted". */
  quote(message: Locator): Locator {
    return message.locator('.bubble__quote');
  }

  /** Opens the message's actions from the keyboard: focus, then Enter (L2-024 AC1). */
  async openByKeyboard(message: Locator): Promise<void> {
    await message.focus();
    await this.page.keyboard.press('Enter');
  }

  /**
   * Opens the message's actions by touch: the finger stays down until the actions show, as a
   * person's would, then lifts (L2-024 AC1).
   */
  async pressAndHold(message: Locator, opened: Locator): Promise<void> {
    const bubble = message.locator('.bubble');
    await bubble.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 });
    await opened.waitFor();
    await bubble.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, button: 0 });
  }
}
