// Acceptance Test
// Traces to: L2-124, L2-056
// Description: A message is announced and can be dismissed; a success message leaves after
// 8 seconds and waits while it is hovered or focused.
import { chatUrl, maraInTheChat } from '../fixtures/chat';
import { expect, test } from '../fixtures/pk-test';
import { GroupChatPage } from '../pages/group-chat.page';
import { MessageActions } from '../pages/message-actions';
import { ReactionsDialog } from '../pages/reactions.dialog';
import { Toasts } from '../pages/toasts';

const ruths = 'Put me down for the 10 o’clock boat, please';

/** A success toast, "Message copied.", from copying Ruth's message. */
async function copied(page: import('@playwright/test').Page): Promise<Toasts> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.install();
  await maraInTheChat(page);
  await page.goto(chatUrl);
  await new MessageActions(page).openByKeyboard(new GroupChatPage(page).message(ruths));
  await new ReactionsDialog(page).copy.click();
  const toasts = new Toasts(page);
  await expect(toasts.toast).toContainText('Message copied.');
  return toasts;
}

test.describe('a success message', () => {
  // L2-124 AC1
  test('is announced politely and can be dismissed', async ({ page }) => {
    const toasts = await copied(page);

    await expect(toasts.region).toHaveAttribute('aria-live', 'polite');
    await toasts.dismiss.click();

    await expect(toasts.toast).toHaveCount(0);
  });

  // L2-124 AC2, L2-056 AC7
  test('leaves after 8 seconds', async ({ page }) => {
    const toasts = await copied(page);

    await page.clock.runFor(8_000);

    await expect(toasts.toast).toHaveCount(0);
  });

  // L2-124 AC2
  test('waits while it is hovered, and leaves 8 seconds after', async ({ page }) => {
    const toasts = await copied(page);

    await toasts.toast.hover();
    await page.clock.runFor(20_000);
    await expect(toasts.toast).toBeVisible();

    await page.mouse.move(0, 0);
    await page.clock.runFor(7_000);
    await expect(toasts.toast).toBeVisible();
    await page.clock.runFor(1_000);
    await expect(toasts.toast).toHaveCount(0);
  });

  // L2-124 AC2
  test('waits while it is focused', async ({ page }) => {
    const toasts = await copied(page);

    await toasts.dismiss.focus();
    await page.clock.runFor(20_000);

    await expect(toasts.toast).toBeVisible();
  });
});
