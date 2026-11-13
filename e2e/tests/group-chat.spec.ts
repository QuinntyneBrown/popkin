import {
  aLongThread,
  chatUrl,
  maraInTheChat,
  message,
  people,
  poppedIn,
  popkinId,
  saturday,
  theMondayAfter,
} from '../fixtures/chat';
import { expect, test } from '../fixtures/pk-test';
import { answer, problem } from '../fixtures/stubs';
import { GroupChatPage } from '../pages/group-chat.page';
import { NotFoundPage } from '../pages/not-found.page';

test.describe('reading the Everyone thread', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: theMondayAfter });
  });

  // L2-021 AC1
  test('shows the Popkin, how many members it has and how many are here now', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.root).toBeVisible();
    await expect(chat.heading).toHaveText('Lakeside Weekend');
    await expect(chat.tile).toHaveText('🏕️');
    await expect(chat.sub).toHaveText('14 members · 5 here now');
    await expect(chat.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-021 AC1
  test('shows the messages oldest first, with the latest in view', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.texts()).toHaveText([
      'Pancakes at the main cabin, 8:30. Bring an appetite.',
      'Dock was glass this morning',
      'Can someone grab the paddles from the shed?',
      'On it! Also: last call for the canoe sign-up 🛶',
      'Put me down for the 10 o’clock boat, please',
    ]);
    await expect(chat.message('Put me down for the 10 o’clock boat')).toBeInViewport();
  });

  // L2-021 AC2
  test('gives someone else’s message their avatar and first name, once for a run', async ({
    page,
  }) => {
    await maraInTheChat(page, (thread) => {
      thread.messages = [
        message(people.walt, 'Pancakes at 8:30.', saturday(8, 5)),
        message(people.walt, 'Bring an appetite.', saturday(8, 6)),
        message(people.ruth, 'Save me two', saturday(8, 7)),
      ];
    });
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    const first = chat.message('Pancakes at 8:30.');
    await expect(chat.nameOf(first)).toHaveText('Walt');
    await expect(chat.avatarOf(first)).toBeVisible();
    const second = chat.message('Bring an appetite.');
    await expect(chat.nameOf(second)).toHaveCount(0);
    await expect(chat.avatarOf(second)).toHaveCount(0);
    await expect(chat.nameOf(chat.message('Save me two'))).toHaveText('Ruth');
    await expect(chat.avatarOf(chat.message('Save me two'))).toHaveText('RL');
  });

  // L2-021 AC3
  test('puts the member’s own message on the right, in the Popkin’s colour, with its time', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    const mine = chat.message('On it! Also: last call');
    await expect(mine).toHaveClass(/msg--mine/);
    await expect(chat.timeOf(mine)).toHaveText('9:24');
    expect(await chat.isOnTheRight(mine)).toBe(true);
    expect(await chat.isOnTheRight(chat.message('Dock was glass'))).toBe(false);
    await expect(chat.nameOf(mine)).toHaveCount(0);
  });

  // L2-021 AC4
  test('names each day over its messages', async ({ page }) => {
    await maraInTheChat(page, (thread) => {
      thread.messages = [
        message(people.walt, 'Tents are up', new Date(2026, 8, 4, 18, 0)),
        message(people.walt, 'Pancakes at 8:30.', new Date(2026, 8, 12, 8, 5)),
        message(people.dev, 'Packing up', new Date(2026, 8, 13, 17, 0)),
        message(people.ruth, 'Home safe', new Date(2026, 8, 14, 7, 30)),
      ];
    });
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.dayDividers).toHaveText(['4 Sep', 'Saturday', 'Yesterday', 'Today']);
    await expect(chat.rows.first()).toHaveText('4 Sep');
  });

  // L2-014 AC4
  test('notes who popped in, at the time they joined', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.notes).toHaveText(['Joel popped in. Say hi! 👋']);
    await expect(chat.rows.nth(0)).toHaveText('Saturday');
    await expect(chat.rows.nth(1)).toHaveText('Joel popped in. Say hi! 👋');
  });

  // L2-021 (loading)
  test('says it is loading until the thread answers', async ({ page }) => {
    const thread = await maraInTheChat(page);
    const release = thread.holdTheThread();
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.loading).toBeAttached();
    await expect(chat.sub).toHaveText('Loading…');
    await expect(chat.skeletons).not.toHaveCount(0);

    release();
    await expect(chat.texts()).toHaveCount(5);
    await expect(chat.skeletons).toHaveCount(0);
  });

  // L2-021 AC8
  test('reads "It’s quiet in here. For now." with three openers when there are no messages', async ({
    page,
  }) => {
    await maraInTheChat(page, (thread) => {
      thread.messages = [];
      thread.thread.memberCount = 1;
      thread.thread.hereNow = 1;
    });
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.emptyHeading).toHaveText('It’s quiet in here. For now.');
    await expect(chat.sub).toHaveText('Just you so far');
    await expect(chat.openers).toHaveText([
      '👋 Hey everyone!',
      'So glad you’re here',
      'Who’s coming?',
    ]);
    await expect(chat.field).toHaveAccessibleName('Say hello…');

    await chat.openers.nth(1).click();
    await expect(chat.field).toHaveValue('So glad you’re here');
    await expect(chat.field).toBeFocused();
  });

  // L2-021 (error), L2-056
  test('says the chat could not load and loads it on "Try again"', async ({ page }) => {
    const thread = await maraInTheChat(page);
    thread.failTheThread();
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.error).toContainText('We couldn’t load the chat');
    await expect(chat.error).toContainText(
      'Your messages are safe. Check your connection and try again.',
    );
    await expect(chat.backToChat).toHaveAttribute('href', `/p/${popkinId}/chat`);
    await expect(chat.composer).toHaveCount(0);

    thread.recover();
    await chat.tryAgain.click();
    await expect(chat.texts()).toHaveCount(5);
  });

  // L2-051: a Popkin is invisible to someone who is not a member
  test('is not found for someone who is not a member', async ({ page }) => {
    await answer(
      page,
      `GET /api/popkins/${popkinId}/threads/everyone`,
      problem(404, 'popkin_not_found'),
    );
    await page.goto(chatUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
    await expect(page).toHaveURL(chatUrl);
  });
});

test.describe('sending a message to everyone', () => {
  // L2-021 AC5
  test('shows the message at once and empties the field on Enter', async ({ page }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('Canoes leave at ten');

    const sent = chat.message('Canoes leave at ten');
    await expect(sent).toHaveClass(/msg--mine/);
    await expect(sent).toBeInViewport();
    await expect(chat.field).toHaveValue('');
    await expect(chat.field).toBeFocused();
    await expect
      .poll(() => thread.sent.map((message) => message.text))
      .toEqual(['Canoes leave at ten']);
    await expect(chat.texts()).toHaveCount(6);
  });

  // L2-021 AC5
  test('sends with the "Send" button too', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.type('Canoes leave at ten');
    await chat.send.click();

    await expect(chat.message('Canoes leave at ten')).toBeVisible();
    await expect(chat.field).toHaveValue('');
  });

  // L2-021 AC5
  test('adds a line on Shift+Enter and keeps it in the message', async ({ page }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.field.pressSequentially('Bring:');
    await chat.field.press('Shift+Enter');
    await chat.field.pressSequentially('paddles');
    await expect(chat.field).toHaveValue('Bring:\npaddles');
    expect(thread.sent).toEqual([]);

    await chat.field.press('Enter');
    await expect
      .poll(() => thread.sent.map((message) => message.text))
      .toEqual(['Bring:\npaddles']);
  });

  // L2-021 AC6
  test('keeps "Send" disabled while the field is empty or holds only spaces', async ({ page }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.send).toBeDisabled();
    await chat.type('   ');
    await expect(chat.send).toBeDisabled();
    await chat.field.press('Enter');
    await chat.type('Hi');
    await expect(chat.send).toBeEnabled();
    expect(thread.sent).toEqual([]);
  });

  // L2-021 AC7
  test('accepts no more than 2,000 characters and shows a count', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.count).toBeEmpty();
    await chat.type('a'.repeat(1999));
    await expect(chat.count).toHaveText('1,999 / 2,000');
    await chat.field.pressSequentially('bcd');
    await expect(chat.field).toHaveValue('a'.repeat(1999) + 'b');
    await expect(chat.count).toHaveText('2,000 / 2,000');
  });

  // L2-052: text is text
  test('shows markup in a message as the characters typed', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('<img src=x onerror="document.title=1"> <b>bold</b>');

    await expect(chat.message('<b>bold</b>')).toBeVisible();
    await expect(chat.message('<b>bold</b>').locator('img, b')).toHaveCount(0);
  });
});

test.describe('messages arriving live', () => {
  // L2-027 AC1
  test('shows a message someone else sends, without reloading', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.texts()).toHaveCount(5);

    await thread.arrives(hub, message(people.walt, 'Kettle is on', new Date()));

    const arrived = chat.message('Kettle is on');
    await expect(arrived).toBeVisible({ timeout: 1_000 });
    await expect(chat.nameOf(arrived)).toHaveText('Walt');
    await expect(arrived).toBeInViewport();
  });

  // L2-027 AC6
  test('announces an arriving message politely, with its sender', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.texts()).toHaveCount(5);

    await thread.arrives(hub, message(people.walt, 'Kettle is on', new Date()));

    await expect(chat.announcements).toHaveText('Walt: Kettle is on');
  });

  // L2-027 AC1: the sender's own echo is recognised
  test('shows a sent message once when its echo arrives over the hub', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('Canoes leave at ten');
    await expect.poll(() => thread.sent.length).toBe(1);
    await hub.push('MessageAdded', thread.messages.at(-1));
    await thread.arrives(hub, message(people.walt, 'Got it', new Date()));

    await expect(chat.message('Got it')).toBeVisible();
    await expect(chat.message('Canoes leave at ten')).toHaveCount(1);
  });

  // L2-027 AC1: what was missed while the connection was down is read on reconnecting
  test('catches up on what it missed after the connection drops', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.texts()).toHaveCount(5);

    await hub.drop();
    thread.messages.push(message(people.dev, 'Sent while you were in the tunnel', new Date()));

    await expect(chat.message('Sent while you were in the tunnel')).toBeVisible();
    expect(hub.connections).toBe(2);
  });

  // L2-021 AC1
  test('keeps "here now" current', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.sub).toHaveText('14 members · 5 here now');

    thread.thread.hereNow = 6;
    thread.thread.presenceVersion = 2;
    await hub.push('PresenceChanged', popkinId, 2, 6);

    await expect(chat.sub).toHaveText('14 members · 6 here now');
  });
});

test.describe('a long thread', () => {
  // L2-027 AC5
  test('loads the latest 50 and earlier ones on scrolling up, without the view jumping', async ({
    page,
  }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.messages = aLongThread(120)));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.texts()).toHaveCount(50);
    await expect(chat.texts().first()).toHaveText('Message 71');
    await expect(chat.message('Message 120')).toBeInViewport();

    await chat.readBack();
    await expect(chat.texts()).toHaveCount(100);
    await expect(chat.message('Message 71')).toBeInViewport();
    expect(thread.asked.filter((query) => query.includes('before'))).toHaveLength(1);

    await chat.readBack();
    await expect(chat.texts()).toHaveCount(120);
    await expect(chat.texts().first()).toHaveText('Message 1');
  });

  // L2-027 AC2
  test('does not move while older messages are read, and offers "New messages"', async ({
    page,
    hub,
  }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.messages = aLongThread(40)));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.message('Message 40')).toBeInViewport();
    await expect(chat.newMessages).toHaveCount(0);

    await chat.readBack();
    await expect(chat.message('Message 40')).not.toBeInViewport();
    const place = await chat.placeOf(chat.message('Message 12'));
    await thread.arrives(hub, message(people.ruth, 'Anyone seen the paddles?', new Date()));

    await expect(chat.newMessages).toBeVisible();
    expect(await chat.placeOf(chat.message('Message 12'))).toBe(place);
    await expect(chat.message('Anyone seen the paddles?')).not.toBeInViewport();

    await chat.newMessages.click();
    await expect(chat.message('Anyone seen the paddles?')).toBeInViewport();
    await expect(chat.newMessages).toHaveCount(0);
  });
});

test.describe('unread messages and the Popkin’s tabs', () => {
  test.use({ viewport: { width: 820, height: 900 } });

  // L2-019 AC7
  test('shows the tabs Home, Chat, Photos and Experiences, with Chat current', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.tabs).toHaveText(['Home', 'Chat', 'Photos', 'Experiences']);
    await expect(chat.currentTab).toHaveText('Chat');
    await expect(chat.tabs.first()).toHaveAttribute('href', `/p/${popkinId}`);
    await expect(chat.unreadBadge).toHaveCount(0);
  });

  // L2-027 AC3, AC4
  test('counts messages that arrive out of view on the Chat tab, until the latest is seen', async ({
    page,
    hub,
  }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.messages = aLongThread(40)));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.message('Message 40')).toBeInViewport();

    await chat.readBack();
    await expect(chat.message('Message 40')).not.toBeInViewport();
    await thread.arrives(hub, message(people.ruth, 'One', new Date()));
    await thread.arrives(hub, message(people.ruth, 'Two', new Date()));

    await expect(chat.unreadCount).toHaveText('2');
    await expect(chat.chatTab).toHaveAccessibleName(/2 unread messages/);

    await chat.newMessages.click();
    await expect(chat.unreadBadge).toHaveCount(0);
    await expect.poll(() => thread.read.at(-1)).toBe(thread.messages.at(-1)?.id);
  });

  // L2-027 AC4
  test('tells the API the thread is read once its latest message is in view', async ({ page }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.thread.unreadCount = 3));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.message('Put me down for the 10 o’clock boat')).toBeInViewport();
    await expect.poll(() => thread.read).toEqual([thread.messages.at(-1)?.id]);
    await expect(chat.unreadBadge).toHaveCount(0);
  });
});

test.describe('a message that cannot be sent', () => {
  // L2-028 AC1
  test('stays in the thread marked "Not sent", and sends on "Try again"', async ({ page }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.failSends = 'server'));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('You’re on the list, Ruth!');

    const failed = chat.message('You’re on the list, Ruth!');
    await expect(chat.statusOf(failed)).toContainText('Not sent');
    await expect(chat.tryAgainOn(failed)).toBeVisible();
    await expect(chat.deleteOn(failed)).toBeVisible();
    await expect(chat.field).toHaveValue('');

    thread.failSends = null;
    await chat.tryAgainOn(failed).click();

    await expect(chat.statusOf(failed)).toHaveCount(0);
    await expect(chat.message('You’re on the list, Ruth!')).toHaveCount(1);
    expect(thread.sent).toHaveLength(2);
    expect(thread.sent[1].clientMessageId).toBe(thread.sent[0].clientMessageId);
  });

  // L2-028 AC1
  test('goes on "Delete"', async ({ page }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.failSends = 'network'));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('You’re on the list, Ruth!');
    const failed = chat.message('You’re on the list, Ruth!');
    await expect(chat.statusOf(failed)).toContainText('Not sent');

    await chat.deleteOn(failed).click();

    await expect(failed).toHaveCount(0);
    // The answer may have been lost with the message stored: the server is asked to drop it.
    await expect.poll(() => thread.discarded).toEqual([thread.sent[0].clientMessageId]);
  });

  // L2-028 AC1: a reload does not lose it
  test('is still there, not sent, after a reload', async ({ page }) => {
    await maraInTheChat(page, (chat) => (chat.failSends = 'network'));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await chat.sendWithEnter('You’re on the list, Ruth!');
    await expect(chat.statusOf(chat.message('You’re on the list, Ruth!'))).toContainText(
      'Not sent',
    );

    await page.reload();

    await expect(chat.statusOf(chat.message('You’re on the list, Ruth!'))).toContainText(
      'Not sent',
    );
  });

  // L2-053 AC2, AC4
  test('says to slow down, and for how long, when messages are sent too fast', async ({ page }) => {
    await maraInTheChat(page, (chat) => (chat.failSends = 'rate-limited'));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.sendWithEnter('One more thing');

    await expect(chat.toast).toContainText('Slow down a little');
    await expect(chat.toast).toContainText('You can send again in 30 seconds.');
    await expect(chat.statusOf(chat.message('One more thing'))).toContainText('Not sent');
  });
});

test.describe('chatting offline', () => {
  // L2-028 AC3
  test('says the device is offline until the connection returns', async ({ page, context }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.texts()).toHaveCount(5);
    await expect(chat.banner).toHaveCount(0);

    await context.setOffline(true);
    await expect(chat.banner).toHaveText('You’re offline. Messages will send when you’re back.');
    await expect(chat.banner).toHaveAttribute('role', 'alert');

    await context.setOffline(false);
    await expect(chat.banner).toHaveCount(0);
  });

  // L2-028 AC2
  test('keeps messages written offline, marked "Waiting to send", and sends them in order', async ({
    page,
    context,
  }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.texts()).toHaveCount(5);

    await context.setOffline(true);
    await chat.sendWithEnter('First from the trail');
    await chat.sendWithEnter('Second from the trail');

    await expect(chat.statusOf(chat.message('First from the trail'))).toHaveText('Waiting to send');
    await expect(chat.statusOf(chat.message('Second from the trail'))).toHaveText(
      'Waiting to send',
    );
    expect(thread.sent).toEqual([]);

    await context.setOffline(false);

    await expect(chat.banner).toHaveText('Back online. 2 messages sent.');
    await expect(chat.banner).toHaveAttribute('role', 'status');
    await expect
      .poll(() => thread.sent.map((message) => message.text))
      .toEqual(['First from the trail', 'Second from the trail']);
    await expect(chat.statusOf(chat.message('First from the trail'))).toHaveCount(0);
    await expect(chat.texts()).toHaveCount(7);
  });

  // L2-028 AC4
  test('keeps what was typed when the member leaves the thread and comes back', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await chat.type('Back in five, don’t start without');
    await page.goto('/');
    await page.goto(chatUrl);

    await expect(chat.field).toHaveValue('Back in five, don’t start without');
    await chat.field.press('Enter');
    await expect(chat.field).toHaveValue('');
    await page.reload();
    await expect(chat.texts()).toHaveCount(6);
    await expect(chat.field).toHaveValue('');
  });
});

test.describe('someone joining', () => {
  // L2-014 AC4, L2-013
  test('adds the note and counts them as they pop in', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.sub).toHaveText('14 members · 5 here now');

    const sam = { ...people.joel, firstName: 'Sam', membershipId: people.joel.membershipId + '1' };
    await hub.push('MemberJoined', popkinId, {
      membershipId: sam.membershipId,
      firstName: 'Sam',
      avatar: sam.avatar,
    });
    await thread.arrives(hub, poppedIn(sam, new Date()));

    await expect(chat.notes.last()).toHaveText('Sam popped in. Say hi! 👋');
    await expect(chat.sub).toHaveText('15 members · 5 here now');
    await expect(chat.toast).toContainText('Sam popped in');
  });
});

test.describe('the thread as the screen grows', () => {
  // L2-058 AC8
  test('shows no tabs on a phone, and Back leads to Chat', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.texts()).toHaveCount(5);
    await expect(chat.nav).toBeHidden();
    await expect(chat.back).toHaveAttribute('href', `/p/${popkinId}/chat`);
    await expect(chat.listPane).toBeHidden();
    await expect(chat.detailPane).toBeHidden();
  });

  // L2-058
  test('sets the list of conversations beside the thread from 1024 px', async ({ page }) => {
    await page.clock.install({ time: theMondayAfter });
    await page.setViewportSize({ width: 1024, height: 800 });
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.listPane).toBeVisible();
    await expect(chat.everyoneCard).toHaveAttribute('aria-current', 'page');
    await expect(chat.everyoneCard).toContainText('Everyone');
    await expect(chat.everyoneCard).toContainText(
      'Ruth: Put me down for the 10 o’clock boat, please',
    );
    await expect(chat.back).toBeHidden();
    await expect(chat.detailPane).toBeHidden();
  });

  // L2-058
  test('names who is here now in a third pane from 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await expect(chat.detailPane).toBeVisible();
    await expect(chat.detailPane).toContainText('Here now');
    await expect(chat.hereNow).toHaveText([
      'Walt Brennan',
      'Ellie Brennan',
      'Dev Patel',
      'Mara Okafor (you)',
      'Ruth Lindqvist',
    ]);
    await expect(chat.others).toHaveText('and 9 others in this Popkin');
  });
});
