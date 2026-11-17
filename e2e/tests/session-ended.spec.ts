import responses from '../fixtures/api/responses.json';
import { expect, test } from '../fixtures/pk-test';
import { chatUrl, maraInTheChat, popkinId, threadId } from '../fixtures/chat';
import { answer } from '../fixtures/stubs';
import { GroupChatPage } from '../pages/group-chat.page';

const created = responses['POST /api/popkins'].body;

// L2-007 AC2: a session that ends while a screen is open sends the person to sign in, with the
// screen to come back to.
test('a session that has ended sends the person to sign in and back', async ({ page, pk }) => {
  await answer(page, `GET /api/popkins/${created.id}/invite`, { status: 401 });

  await pk.open('popkinCreated');

  await expect(page).toHaveURL(
    `/sign-in?returnUrl=${encodeURIComponent(`/p/${created.id}/created`)}`,
  );
});

// CQ-06, L2-054: nothing of the person stays connected once their session has ended.
test('a session that has ended closes the live connection', async ({ page, hub }) => {
  await maraInTheChat(page);
  await page.goto(chatUrl);
  await hub.connected();
  await answer(page, `POST /api/popkins/${popkinId}/threads/${threadId}/messages`, {
    status: 401,
  });
  const chat = new GroupChatPage(page);

  await chat.field.fill('Anyone up for a swim?');
  await chat.send.click();

  await expect(page).toHaveURL(/\/sign-in\?returnUrl=/);
  await expect.poll(() => hub.closed, { message: 'the live connections closed' }).toBe(1);
});
