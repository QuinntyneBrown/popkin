import {
  aLongThread,
  chatOf,
  chatUrl,
  directUrl,
  maraInTheChat,
  message,
  people,
  quoteOf,
  saturday,
  theMockThread,
} from '../fixtures/chat';
import { maraAtHome } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { DeleteMessageDialog } from '../pages/delete-message.dialog';
import { DirectMessagePage } from '../pages/direct-message.page';
import { GroupChatPage } from '../pages/group-chat.page';
import { MessageActions } from '../pages/message-actions';
import { ReactionsDialog } from '../pages/reactions.dialog';
import { Toasts } from '../pages/toasts';

const ruths = 'Put me down for the 10 o’clock boat, please';
const walts = 'Pancakes at the main cabin, 8:30. Bring an appetite.';
const maras = 'On it! Also: last call for the canoe sign-up 🛶';
const ellies = 'Can someone grab the paddles from the shed?';

test.describe('message actions (L2-024 AC1)', () => {
  test('open from the keyboard with five quick reactions, More reactions, Reply and Copy', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const dialog = new ReactionsDialog(page);

    await actions.openByKeyboard(chat.message(ruths));

    await expect(dialog.heading).toHaveText('Message actions');
    await expect(dialog.quote).toContainText(ruths);
    await expect
      .poll(() => dialog.quickNames())
      .toEqual([
        'React heart',
        'React laughing',
        'React heart eyes',
        'React fire',
        'React clapping',
      ]);
    await expect(dialog.moreReactions).toBeVisible();
    await expect(dialog.reply).toBeVisible();
    await expect(dialog.copy).toBeVisible();
    await expect(dialog.delete).toHaveCount(0);
  });

  test('close with Escape and give the focus back to the message', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const dialog = new ReactionsDialog(page);

    await new MessageActions(page).openByKeyboard(chat.message(ruths));
    await expect(dialog.root).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(chat.message(ruths)).toBeFocused();
  });

  test('open by pressing and holding a message on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const dialog = new ReactionsDialog(page);

    await new MessageActions(page).pressAndHold(chat.message(ruths), dialog.root);

    await expect(dialog.quick).toHaveCount(5);
  });

  test('offer Delete on the member’s own message', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const dialog = new ReactionsDialog(page);

    await new MessageActions(page).openByKeyboard(new GroupChatPage(page).message(maras));

    await expect(dialog.delete).toBeVisible();
  });

  test('open from the thread beside the list at 1280 px too', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const dialog = new ReactionsDialog(page);

    await new MessageActions(page).openByKeyboard(chat.message(ruths));

    await expect(dialog.quick).toHaveCount(5);
  });
});

test.describe('reacting (L2-024)', () => {
  test('a quick reaction shows as a chip with its count, pressed as the member’s own (AC2)', async ({
    page,
  }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const ruth = chat.message(ruths);

    await actions.openByKeyboard(ruth);
    await new ReactionsDialog(page).react('heart').click();

    const heart = actions.chip(ruth, 'Heart');
    await expect(heart).toHaveAccessibleName('Heart, you reacted, 1');
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toContainText('❤️');
    await expect(heart).toContainText('1');
    await expect(new ReactionsDialog(page).root).toHaveCount(0);
    expect(fixture.reacted).toEqual([`+❤️ ${fixture.messages.at(-1)?.id}`]);
  });

  test('says each chip’s name, its count and whether the member reacted (AC5)', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await expect
      .poll(() => actions.chipNames(chat.message(walts)))
      .toEqual(['Pancakes, 6', 'Heart, you reacted, 3']);
    await expect(actions.chip(chat.message(walts), 'Pancakes')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect.poll(() => actions.chipNames(chat.message(ruths))).toEqual(['Thumbs up, 2']);
  });

  test('choosing the member’s own chip takes the reaction away, one fewer (AC3)', async ({
    page,
  }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await actions.chip(chat.message(walts), 'Heart').click();

    await expect(actions.chip(chat.message(walts), 'Heart')).toHaveAccessibleName('Heart, 2');
    await expect(actions.chip(chat.message(walts), 'Heart')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(fixture.reacted).toEqual([`-❤️ ${fixture.messages[1].id}`]);
  });

  test('a chip that reaches zero goes (AC3)', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const ruth = chat.message(ruths);

    await actions.openByKeyboard(ruth);
    await new ReactionsDialog(page).react('fire').click();
    await expect(actions.chip(ruth, 'Fire')).toBeVisible();
    await actions.chip(ruth, 'Fire').click();

    await expect(actions.chip(ruth, 'Fire')).toHaveCount(0);
    await expect.poll(() => actions.chipNames(ruth)).toEqual(['Thumbs up, 2']);
  });

  test('choosing someone else’s chip adds the member to it', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await actions.chip(chat.message(ruths), 'Thumbs up').click();

    await expect(actions.chip(chat.message(ruths), 'Thumbs up')).toHaveAccessibleName(
      'Thumbs up, you reacted, 3',
    );
  });

  test('a second, different emoji shows beside the first (AC4)', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const dialog = new ReactionsDialog(page);
    const ruth = chat.message(ruths);

    await actions.openByKeyboard(ruth);
    await dialog.react('heart').click();
    await actions.openByKeyboard(ruth);
    await expect(dialog.react('heart')).toHaveAttribute('aria-pressed', 'true');
    await dialog.react('laughing').click();

    await expect
      .poll(() => actions.chipNames(ruth))
      .toEqual(['Thumbs up, 2', 'Heart, you reacted, 1', 'Laughing, you reacted, 1']);
  });

  test('More reactions offers twelve more, and one of them reacts', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const dialog = new ReactionsDialog(page);
    const dev = chat.message('Dock was glass this morning');

    await actions.openByKeyboard(dev);
    await dialog.moreReactions.click();
    await expect(dialog.more).toHaveCount(12);
    await dialog.react('pancakes').click();

    await expect(actions.chip(dev, 'Pancakes')).toHaveAccessibleName('Pancakes, you reacted, 1');
  });

  test('what others choose shows as it happens', async ({ page, hub }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    await expect(chat.message(ruths)).toBeVisible();
    await hub.connected();

    const ruth = fixture.messages.find((m) => m.text === ruths);
    if (!ruth) throw new Error('Ruth’s message is in the mock thread');
    await fixture.reacts(hub, people.dev, ruth, '😂');

    await expect(actions.chip(chat.message(ruths), 'Laughing')).toHaveAccessibleName('Laughing, 1');
  });

  test('a reaction that does not save goes back, and says so with Try again', async ({ page }) => {
    const fixture = await maraInTheChat(page, (chat) => (chat.failReactions = true));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const toasts = new Toasts(page);
    const ruth = chat.message(ruths);

    await actions.openByKeyboard(ruth);
    await new ReactionsDialog(page).react('heart').click();

    await expect(toasts.toast).toContainText('We couldn’t save your reaction.');
    await expect.poll(() => actions.chipNames(ruth)).toEqual(['Thumbs up, 2']);

    fixture.failReactions = false;
    await toasts.action('Try again').click();
    await expect(actions.chip(ruth, 'Heart')).toHaveAccessibleName('Heart, you reacted, 1');
  });
});

test.describe('copying and deleting (L2-024 AC1)', () => {
  test('Copy puts the message on the clipboard and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await maraInTheChat(page);
    await page.goto(chatUrl);

    await new MessageActions(page).openByKeyboard(new GroupChatPage(page).message(ruths));
    await new ReactionsDialog(page).copy.click();

    await expect(new Toasts(page).toast).toContainText('Message copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ruths);
  });

  test('Delete asks first, then the member’s message goes for everyone', async ({ page }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const confirm = new DeleteMessageDialog(page);
    const mine = fixture.messages.find((m) => m.text === maras);

    await new MessageActions(page).openByKeyboard(chat.message(maras));
    await new ReactionsDialog(page).delete.click();
    await expect(confirm.heading).toHaveText('Delete this message?');
    await expect(confirm.description).toHaveText('It’s removed for everyone in this chat.');
    await confirm.delete.click();

    await expect(chat.message(maras)).toHaveCount(0);
    expect(fixture.deleted).toEqual([mine?.id]);
  });

  test('Keep leaves the message where it is', async ({ page }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await new MessageActions(page).openByKeyboard(chat.message(maras));
    await new ReactionsDialog(page).delete.click();
    await new DeleteMessageDialog(page).keep.click();

    await expect(chat.message(maras)).toBeVisible();
    expect(fixture.deleted).toEqual([]);
  });

  test('a deletion that fails keeps the message and says so with Try again', async ({ page }) => {
    const fixture = await maraInTheChat(page, (chat) => (chat.failDeletes = true));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const toasts = new Toasts(page);

    await new MessageActions(page).openByKeyboard(chat.message(maras));
    await new ReactionsDialog(page).delete.click();
    await new DeleteMessageDialog(page).delete.click();

    await expect(toasts.toast).toContainText('We couldn’t delete your message.');
    await expect(chat.message(maras)).toBeVisible();
    fixture.failDeletes = false;
    await toasts.action('Try again').click();
    await expect(chat.message(maras)).toHaveCount(0);
  });
});

test.describe('replying (L2-025)', () => {
  test('Reply shows "Replying to" with one line and Cancel reply, the focus in the field (AC1)', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await actions.openByKeyboard(chat.message(ruths));
    await new ReactionsDialog(page).reply.click();

    await expect(actions.replyingTo).toHaveText('Replying to Ruth');
    await expect(actions.replySnippet).toHaveText(ruths);
    await expect(actions.cancelReply).toBeVisible();
    await expect(chat.field).toBeFocused();
  });

  test('Cancel reply takes the bar away and keeps the focus in the field', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await actions.openByKeyboard(chat.message(ruths));
    await new ReactionsDialog(page).reply.click();
    await actions.cancelReply.click();

    await expect(actions.replyBar).toHaveCount(0);
    await expect(chat.field).toBeFocused();
  });

  test('a sent reply carries a quote with the first name and one line (AC2)', async ({ page }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const ruth = fixture.messages.find((m) => m.text === ruths);

    await actions.openByKeyboard(chat.message(ruths));
    await new ReactionsDialog(page).reply.click();
    await chat.sendWithEnter('Done, you’re on the 10 o’clock');

    const reply = chat.message('Done, you’re on the 10 o’clock');
    await expect(actions.quote(reply)).toContainText('Ruth');
    await expect(actions.quote(reply)).toContainText(ruths);
    await expect(actions.replyBar).toHaveCount(0);
    expect(fixture.sent.at(-1)).toMatchObject({ replyToMessageId: ruth?.id });
  });

  test('choosing a quote goes to the quoted message and marks it briefly (AC3)', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    const quote = actions.quote(chat.message(maras));

    await expect(quote).toHaveAccessibleName('Go to Ellie’s message');
    await quote.click();

    const ellie = chat.message(ellies);
    await expect(ellie).toBeFocused();
    await expect(ellie).toBeInViewport();
    await expect(ellie).toHaveClass(/msg--marked/);
    await expect(ellie).not.toHaveClass(/msg--marked/, { timeout: 5_000 });
  });

  test('a quote of a message older than those loaded loads it and goes there (AC3)', async ({
    page,
  }) => {
    const long = aLongThread(120);
    const first = long[0];
    await maraInTheChat(page, (chat) => {
      chat.messages = [
        ...long,
        message(people.dev, 'Back to the very start', saturday(9, 0), {
          quote: quoteOf(first),
        }),
      ];
    });
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    await new MessageActions(page).quote(chat.message('Back to the very start')).click();

    await expect(chat.message('Message 1').first()).toBeFocused();
  });

  test('the quote of a deleted message reads "Message deleted" and goes nowhere (AC4)', async ({
    page,
    hub,
  }) => {
    const fixture = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);
    await expect(chat.message(ellies)).toBeVisible();
    await hub.connected();

    const ellie = fixture.messages.find((m) => m.text === ellies);
    if (!ellie) throw new Error('Ellie’s message is in the mock thread');
    await fixture.deletes(hub, ellie);

    await expect(chat.message(ellies)).toHaveCount(0);
    const quote = actions.quote(chat.message(maras));
    await expect(quote).toHaveText('Message deleted');
    await expect(quote).not.toHaveRole('button');
  });
});

test.describe('in a direct message (L2-023 AC3)', () => {
  const walt = directUrl(people.walt);

  test('reacts and replies the same way', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const dm = new DirectMessagePage(page);
    const actions = new MessageActions(page);
    const dialog = new ReactionsDialog(page);
    const corner = dm.message('Ha, I’ll save you the corner piece.');

    await actions.openByKeyboard(corner);
    await dialog.react('laughing').click();
    await expect(actions.chip(corner, 'Laughing')).toHaveAccessibleName('Laughing, you reacted, 1');

    await actions.openByKeyboard(corner);
    await dialog.reply.click();
    await expect(actions.replyingTo).toHaveText('Replying to Walt');
    await dm.field.fill('Deal.');
    await dm.field.press('Enter');

    await expect(actions.quote(dm.message('Deal.'))).toContainText('Walt');
    expect(chatOf(page).reacted).toHaveLength(1);
  });

  test('shows the chips the mock draws', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(walt);
    const dm = new DirectMessagePage(page);

    await expect
      .poll(() => new MessageActions(page).chipNames(dm.message('Here’s the card she wrote it on')))
      .toEqual(['Heart, you reacted, 1']);
  });
});

test.describe('in a Popkin that has wrapped up (L2-045)', () => {
  test('shows the chips and quotes, and opens no actions', async ({ page }) => {
    await maraInTheChat(page, (chat) => {
      chat.thread.readOnly = true;
      chat.messages = theMockThread();
    });
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const actions = new MessageActions(page);

    await expect
      .poll(() => actions.chipNames(chat.message(walts)))
      .toEqual(['Pancakes, 6', 'Heart, you reacted, 3']);
    await expect(actions.chips(chat.message(walts)).first()).not.toHaveRole('button');
    await chat
      .message(ruths)
      .focus()
      .catch(() => undefined);
    await page.keyboard.press('Enter');
    await expect(new ReactionsDialog(page).root).toHaveCount(0);
    await expect(actions.quote(chat.message(maras))).toHaveRole('button');
  });
});
