// Acceptance Test
// Traces to: L2-074 AC7
// Description: "Plan dinner in chat" and "Ask in chat anyway" open the Everyone thread with a
// draft in the message field, not yet sent.
import { expect, test } from '../fixtures/pk-test';
import { maraThisWeek, theMocksHours, thisWeekDayUrl } from '../fixtures/schedule';
import { GroupChatPage } from '../pages/group-chat.page';
import { ThisWeekPage } from '../pages/this-week.page';

test.describe('taking an evening to chat', () => {
  // L2-074 AC7
  test('"Plan dinner in chat" opens Everyone with the draft, not sent', async ({ page }) => {
    await maraThisWeek(page, theMocksHours);
    const sent: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/messages'))
        sent.push(request.url());
    });
    await page.goto(thisWeekDayUrl('2026-09-16'));

    await new ThisWeekPage(page).chatAction.click();

    const chat = new GroupChatPage(page);
    await expect(chat.root).toBeVisible();
    await expect(chat.field).toHaveValue(
      'Everyone’s free Wednesday from 7:30 pm. Dinner to catch up on the plan? Ideas for where?',
    );
    expect(sent).toEqual([]);
  });

  // L2-074 AC7
  test('"Ask in chat anyway" opens Everyone asking those who are free', async ({ page }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekDayUrl('2026-09-15'));
    const thisWeek = new ThisWeekPage(page);
    await expect(thisWeek.chatAction).toHaveText('Ask in chat anyway');

    await thisWeek.chatAction.click();

    await expect(new GroupChatPage(page).field).toHaveValue(
      'Mara, Walt and Priya: free Tuesday evening? Could be a small dinner to catch up on the plan.',
    );
  });
});
