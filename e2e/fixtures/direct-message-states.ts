import { expect, type Page } from '@playwright/test';
import { ConversationsPage } from '../pages/conversations.page';
import { DirectMessagePage } from '../pages/direct-message.page';
import { NewMessageDialog } from '../pages/new-message.dialog';
import { callers, maraWithACall } from './call';
import { type Chat, message, people, saturday, theMockThread } from './chat';
import { type Home, theFourteen, theMockHome } from './home';
import type { RouteKey } from './routes';

/*
 * The states of journey 11, Direct message, the mocks draw, for the sweeps and the parity
 * specs: `before` is the step before the page opens (the answers of the API and the hub),
 * `app` what brings the open page to the state (opening New message, typing "Zz").
 */

interface DirectMessageState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

/**
 * The list as the mocks draw it: three unread to everyone, ending on Mara's line, and Walt's
 * message unread. The page is in a background tab, so the Everyone thread beside the list
 * from 1024 px is never read and its count stays.
 */
function theMockList(chat: Chat): void {
  chat.thread.unreadCount = 3;
  chat.messages = [
    ...theMockThread().slice(0, 4),
    message(people.mara, 'last call for the canoe sign-up 🛶', saturday(9, 24)),
  ];
}

async function unseen(page: Page): Promise<void> {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' }),
  );
}

const chatOfHome = (change: (chat: Chat) => void) => (home: Home) => change(home.chat);

async function theList(
  page: Page,
  change?: (chat: Chat) => void,
  changeHome?: (home: Home) => void,
): Promise<void> {
  await unseen(page);
  await theMockHome(page, (home) => {
    chatOfHome((chat) => {
      theMockList(chat);
      change?.(chat);
    })(home);
    changeHome?.(home);
  });
}

/** The six members the New message mock lists, with Mara, who is not listed. */
const sixMembers = (home: Home) => (home.members = theFourteen.slice(0, 7));

/** Walt's direct message, as the mocks draw it, read: the list beside it shows it open. */
async function walt(page: Page, change?: (chat: Chat) => void): Promise<void> {
  await theList(page, (chat) => {
    chat.direct(people.walt).unreadCount = 0;
    change?.(chat);
  });
}

/** The dialog open, its search field holding the focus, as the mock draws it. */
async function openNewMessage(page: Page): Promise<void> {
  await new ConversationsPage(page).newMessage.click();
  const dialog = new NewMessageDialog(page);
  await expect(dialog.members.first()).toBeVisible();
  await dialog.search.focus();
}

export const directMessageStates = {
  conversations: { before: (page) => theList(page) },
  conversationsLoading: {
    before: (page) => theList(page, (chat) => void chat.holdTheList()),
  },
  conversationsEmpty: { before: (page) => theList(page, (chat) => (chat.directs = [])) },
  conversationsError: { before: (page) => theList(page, (chat) => chat.failTheList()) },
  newMessage: {
    before: (page) => theList(page, undefined, sixMembers),
    app: openNewMessage,
  },
  newMessageNoResults: {
    before: (page) => theList(page, undefined, sixMembers),
    app: async (page) => {
      await openNewMessage(page);
      await new NewMessageDialog(page).search.fill('Zz');
      await expect(new NewMessageDialog(page).noResults).toBeVisible();
    },
  },
  directMessage: { before: (page) => walt(page) },
  directMessageLoading: { before: (page) => walt(page, (chat) => void chat.holdTheThread()) },
  directMessageEmpty: {
    before: (page) => walt(page, (chat) => (chat.direct(people.walt).messages = [])),
  },
  directMessageError: { before: (page) => walt(page, (chat) => chat.failTheThread()) },
  directMessageReadOnly: {
    before: (page) =>
      walt(page, (chat) => {
        chat.thread.readOnly = true;
        chat.thread.endsAt = null;
      }),
  },
  directMessageCall: {
    before: async (page) => {
      await unseen(page);
      await maraWithACall(page, (call, home) => {
        theMockList(home.chat);
        home.chat.direct(people.walt).unreadCount = 0;
        call.underWay = true;
        call.others = [callers.walt];
        call.threadId = home.chat.direct(people.walt).id;
      });
    },
    app: async (page) => {
      await expect(new DirectMessagePage(page).callBanner).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, DirectMessageState>>;
