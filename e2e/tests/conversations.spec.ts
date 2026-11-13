import {
  chatOf,
  conversationsUrl,
  directUrl,
  message,
  people,
  popkinId,
  saturday,
} from '../fixtures/chat';
import { maraAtHome } from '../fixtures/home';
import { mockToday } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { ConversationsPage } from '../pages/conversations.page';
import { DirectMessagePage } from '../pages/direct-message.page';
import { GroupChatPage } from '../pages/group-chat.page';
import { NewMessageDialog } from '../pages/new-message.dialog';
import { NotFoundPage } from '../pages/not-found.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: mockToday });
});

test.describe('the Chat tab', () => {
  // L2-022 AC1
  test('puts Everyone first, with its latest message, time and unread count', async ({ page }) => {
    await maraAtHome(page, (home) => {
      home.chat.thread.unreadCount = 3;
      home.chat.everyoneLatest = {
        firstName: 'Mara',
        text: 'last call for the canoe sign-up 🛶',
        isMine: true,
        sentAt: saturday(9, 24).toISOString(),
      };
    });
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.root).toBeVisible();
    await expect(chat.heading).toHaveText('Chat');
    await expect(chat.everyoneLatest).toHaveText('Mara: last call for the canoe sign-up 🛶');
    await expect(chat.everyoneTime).toHaveText('9:24');
    await expect(chat.everyoneUnread).toHaveAccessibleName('3 unread messages');
  });

  // L2-022 AC1
  test('Everyone opens the Everyone thread', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).everyone.click();

    await expect(page).toHaveURL(`/p/${popkinId}/chat/everyone`);
    await expect(new GroupChatPage(page).root).toBeVisible();
  });

  // L2-022 AC2
  test('lists the direct messages under "Direct messages", the most recent first', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.directLabel).toHaveText('Direct messages');
    await expect(chat.rows).toHaveCount(4);
    const walt = chat.row('Walt Brennan');
    await expect(walt.name).toHaveText('Walt Brennan');
    await expect(walt.latest).toHaveText('Ha, I’ll save you the corner piece.');
    await expect(walt.time).toHaveText('9:41');
    await expect(chat.row('Ellie Brennan').latest).toHaveText('You: thanks for the paddles!');
    await expect(chat.row('Dev Patel').time).toHaveText('Fri');
    await expect(chat.rows.first()).toContainText('Walt Brennan');
    await expect(chat.rows.last()).toContainText('Ruth Lindqvist');
  });

  // L2-022 AC3
  test('marks an unread direct message with a bold name and a dot named "Unread"', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.row('Walt Brennan').unreadDot).toHaveAccessibleName('Unread');
    await expect(chat.row('Ellie Brennan').unreadDot).toHaveCount(0);
  });

  // L2-022 AC2
  test('a row opens the direct message with that member', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).row('Walt Brennan').name.click();

    await expect(page).toHaveURL(directUrl(people.walt));
    await expect(new DirectMessagePage(page).root).toBeVisible();
  });

  // L2-022 AC2, AC3
  test('moves a direct message first, unread, when a message arrives in it', async ({
    page,
    hub,
  }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);
    await expect(chat.rows).toHaveCount(4);

    await chatOf(page).writes(hub, people.ruth, 'Boat leaves in five');

    await expect(chat.rows.first()).toContainText('Ruth Lindqvist');
    await expect(chat.row('Ruth Lindqvist').latest).toHaveText('Boat leaves in five');
    await expect(chat.row('Ruth Lindqvist').unreadDot).toBeVisible();
  });

  // L2-022 AC2
  test('lists a direct message someone begins with the member', async ({ page, hub }) => {
    await maraAtHome(page, (home) => {
      home.chat.directs = [];
    });
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);
    await expect(chat.empty).toBeVisible();

    await chatOf(page).writes(hub, people.dev, 'Heron at the dock!');

    await expect(chat.rows).toHaveCount(1);
    await expect(chat.row('Dev Patel').latest).toHaveText('Heron at the dock!');
  });

  // L2-022 AC1
  test('counts a message to everyone that arrives', async ({ page, hub }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);
    await expect(chat.everyone).toBeVisible();

    await chatOf(page).arrives(hub, message(people.walt, 'Kettle is on', new Date()));

    await expect(chat.everyoneLatest).toHaveText('Walt: Kettle is on');
    await expect(chat.everyoneUnread).toHaveAccessibleName('1 unread message');
  });

  // L2-022 AC5
  test('says direct messages are between two members and offers "New message" when there are none', async ({
    page,
  }) => {
    await maraAtHome(page, (home) => {
      home.chat.directs = [];
    });
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.empty).toContainText('No direct messages yet');
    await expect(chat.empty).toContainText(
      'A direct message is between you and one other member. Nobody else can see it.',
    );
    await chat.emptyNewMessage.click();
    await expect(new NewMessageDialog(page).root).toBeVisible();
  });

  // L2-056
  test('says it is loading until the threads arrive', async ({ page }) => {
    let release: () => void = () => undefined;
    await maraAtHome(page, (home) => {
      release = home.chat.holdTheList();
    });
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.loading).toBeVisible();
    release();
    await expect(chat.rows).toHaveCount(4);
    await expect(chat.loading).toBeHidden();
  });

  // L2-056
  test('says the threads did not load, and reads them again on "Try again"', async ({ page }) => {
    await maraAtHome(page, (home) => home.chat.failTheList());
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);

    await expect(chat.error).toBeVisible();
    chatOf(page).recover();
    await chat.tryAgain.click();
    await expect(chat.rows).toHaveCount(4);
  });

  // L2-051
  test('is not found for someone who is not a member', async ({ page }) => {
    await maraAtHome(page, (home) => home.chat.failTheList('not-found'));
    await page.goto(conversationsUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  // L2-058
  test('is the screen on a phone, and sits beside the Everyone thread from 1024 px', async ({
    page,
  }) => {
    await maraAtHome(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);
    await expect(chat.rows).toHaveCount(4);
    await expect(chat.threadPane).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(chat.threadPane).toBeVisible();
    await expect(chat.newMessage).toBeVisible();
  });
});

test.describe('New message', () => {
  // L2-022 AC4
  test('lists the Popkin’s members other than the member', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).newMessage.click();
    const dialog = new NewMessageDialog(page);

    await expect(dialog.heading).toHaveText('New message');
    await expect(dialog.members).toHaveCount(13);
    await expect(dialog.member('Walt Brennan')).toBeVisible();
    await expect(dialog.member('Mara Okafor')).toHaveCount(0);
  });

  // L2-022 AC4
  test('finds a member by any part of the name, ignoring case and accents', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).newMessage.click();
    const dialog = new NewMessageDialog(page);

    await dialog.search.fill('tomas');
    await expect(dialog.members).toHaveCount(1);
    await expect(dialog.member('Tomás Rivera')).toBeVisible();

    await dialog.search.fill('BREN');
    await expect(dialog.members).toHaveCount(2);
  });

  // L2-022 AC4, L2-056
  test('says nobody is by that name', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).newMessage.click();
    const dialog = new NewMessageDialog(page);

    await dialog.search.fill('Zed');
    await expect(dialog.members).toHaveCount(0);
    await expect(dialog.noResults).toContainText('Nobody by that name');
    await expect(dialog.noResults).toContainText(
      'Only members of Lakeside Weekend can be messaged here.',
    );
  });

  // L2-022 AC4, L2-023 AC1
  test('choosing a member opens the direct message with them', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    await new ConversationsPage(page).newMessage.click();
    const dialog = new NewMessageDialog(page);

    await dialog.member('Sam Ortega').click();

    await expect(dialog.root).toBeHidden();
    const sam = chatOf(page).members.find((m) => m.displayName === 'Sam Ortega');
    await expect(page).toHaveURL(directUrl({ membershipId: sam!.membershipId }));
    const direct = new DirectMessagePage(page);
    await expect(direct.name).toHaveText('Sam Ortega');
    await expect(direct.empty).toContainText('Say hello to Sam.');
  });

  // L2-058
  test('closes with Escape and returns focus to "New message"', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(conversationsUrl);
    const chat = new ConversationsPage(page);
    await chat.newMessage.click();
    const dialog = new NewMessageDialog(page);
    await expect(dialog.search).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(dialog.root).toBeHidden();
    await expect(chat.newMessage).toBeFocused();
  });
});
