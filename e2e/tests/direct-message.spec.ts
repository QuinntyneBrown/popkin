import { callers, callOf, maraWithACall } from '../fixtures/call';
import { chatOf, conversationsUrl, directUrl, people, popkinId } from '../fixtures/chat';
import { maraAtHome } from '../fixtures/home';
import { mockToday } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { ConversationsPage } from '../pages/conversations.page';
import { DirectMessagePage } from '../pages/direct-message.page';
import { NotFoundPage } from '../pages/not-found.page';
import { VideoCallPage } from '../pages/video-call.page';

const walt = directUrl(people.walt);

test.describe('a direct message', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: mockToday });
  });

  // L2-023 AC1
  test('names the other member and the Popkin, and says only the two can see it', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const direct = new DirectMessagePage(page);

    await expect(direct.root).toBeVisible();
    await expect(direct.name).toHaveText('Walt Brennan');
    await expect(direct.from).toHaveText('From 🏕️ Lakeside Weekend');
    await expect(direct.intro).toContainText('Only you two can see this');
    await expect(direct.introName).toHaveText('Walt Brennan');
    await expect(direct.messages).toHaveCount(5);
    await expect(direct.messages.last()).toContainText('Ha, I’ll save you the corner piece.');
    await expect(direct.field).toHaveAttribute('placeholder', 'Message Walt');
  });

  // L2-023 AC1
  test('with nothing written yet, invites the member to say hello', async ({ page }) => {
    await maraAtHome(page, (home) => (home.chat.direct(people.walt).messages = []));
    await page.goto(walt);
    const direct = new DirectMessagePage(page);

    await expect(direct.empty).toContainText('Say hello to Walt.');
    await expect(direct.empty).toContainText('This is the start of your chat.');
  });

  // L2-023 AC2, AC3
  test('sends a message to the other member alone', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);

    await direct.field.fill('Deal. See you at 8.');
    await direct.send.click();

    await expect(direct.messages.last()).toContainText('Deal. See you at 8.');
    const chat = chatOf(page);
    expect(chat.sent.map((sent) => sent.text)).toEqual(['Deal. See you at 8.']);
    expect(chat.direct(people.walt).messages.at(-1)?.text).toBe('Deal. See you at 8.');
    expect(chat.messages.some((m) => m.text === 'Deal. See you at 8.')).toBe(false);
  });

  // L2-023 AC2, AC3
  test('shows what the other member writes, without reloading', async ({ page, hub }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);

    await chatOf(page).writes(hub, people.walt, 'Bring syrup?');

    await expect(direct.messages.last()).toContainText('Bring syrup?');
  });

  // L2-023 AC2
  test('does not show a message of another thread', async ({ page, hub }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);

    await chatOf(page).writes(hub, people.dev, 'Heron again!');

    await expect(direct.thread).not.toContainText('Heron again!');
    await expect(direct.messages).toHaveCount(5);
  });

  // L2-023 AC2, L2-051
  test('is not found for a member the Popkin does not have', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(`/p/${popkinId}/chat/00000000-0000-4000-8000-0000000000ff`);

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-023 AC4
  test('cannot be started with oneself', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(directUrl(people.mara));

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-023 AC5
  test('is read-only once the Popkin has wrapped up', async ({ page }) => {
    await maraAtHome(page, (home) => {
      home.chat.thread.readOnly = true;
      home.chat.thread.endsAt = null;
    });
    await page.goto(walt);
    const direct = new DirectMessagePage(page);

    await expect(direct.messages).toHaveCount(5);
    await expect(direct.closed).toBeVisible();
    await expect(direct.field).toHaveCount(0);
  });

  // L2-056
  test('says the thread did not load, and reads it again on "Try again"', async ({ page }) => {
    await maraAtHome(page, (home) => home.chat.failTheThread());
    await page.goto(walt);
    const direct = new DirectMessagePage(page);

    await expect(direct.error).toBeVisible();
    chatOf(page).recover();
    await direct.tryAgain.click();
    await expect(direct.messages).toHaveCount(5);
  });

  // L2-058
  test('"Back" returns to the Chat tab', async ({ page }) => {
    await maraAtHome(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(walt);
    await new DirectMessagePage(page).back.click();

    await expect(page).toHaveURL(conversationsUrl);
    await expect(new ConversationsPage(page).root).toBeVisible();
  });

  // L2-058
  test('shows the list beside it from 1024 px and the other member from 1280 px', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);
    await expect(direct.listPane).toBeHidden();
    await expect(direct.personPane).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(direct.listPane).toBeVisible();
    await expect(direct.personPane).toBeHidden();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(direct.personPane).toBeVisible();
    await expect(direct.personPane).toContainText('Walt Brennan');
  });

  // L2-027 AC3
  test('reading it clears its unread mark in the list', async ({ page }) => {
    await maraAtHome(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);

    await expect(new ConversationsPage(page).row('Walt Brennan').unreadDot).toHaveCount(0);
    expect(chatOf(page).read.length).toBeGreaterThan(0);
  });
});

test.describe('calling from a direct message', () => {
  // L2-030 AC8
  test('"Call Walt" opens a call between the two of them with the same controls', async ({
    page,
  }) => {
    const call = await maraWithACall(page);
    await page.goto(walt);
    await new DirectMessagePage(page).call.click();
    const video = new VideoCallPage(page);

    await expect(page).toHaveURL(`${walt}/call`);
    await expect(video.heading).toHaveText('Walt Brennan');
    await expect(video.sub).toHaveText(/^Just you · 0:0\d$/);
    await expect(video.mute).toBeVisible();
    await expect(video.camera).toBeVisible();
    await expect(video.leave).toBeVisible();
    expect(call.joined).toEqual([
      { micOn: true, cameraOn: true, threadId: chatOf(page).direct(people.walt).id },
    ]);
  });

  // L2-030 AC8, AC6
  test('leaving the call returns to the direct message', async ({ page }) => {
    await maraWithACall(page);
    await page.goto(walt);
    await new DirectMessagePage(page).call.click();
    const video = new VideoCallPage(page);
    await expect(video.leave).toBeVisible();

    await video.leave.click();

    await expect(page).toHaveURL(walt);
    expect(callOf(page).left).toBe(1);
  });

  // L2-030 AC8, gap 12
  test('shows a banner in the direct message when the other member is calling', async ({
    page,
    hub,
  }) => {
    const call = await maraWithACall(page);
    await page.goto(walt);
    const direct = new DirectMessagePage(page);
    await expect(direct.messages).toHaveCount(5);

    call.threadId = chatOf(page).direct(people.walt).id;
    await call.joins(hub, callers.walt);

    await expect(direct.callBanner).toContainText('1 on the call');
    await direct.joinCall.click();
    await expect(page).toHaveURL(`${walt}/call`);
  });
});
