import type { Page } from '@playwright/test';
import { DeleteMessageDialog } from '../pages/delete-message.dialog';
import { GroupChatPage } from '../pages/group-chat.page';
import { MessageActions } from '../pages/message-actions';
import { ReactionsDialog } from '../pages/reactions.dialog';
import { theMockChat } from './chat';
import { wrapUpStates } from './wrap-up-states';
import type { RouteKey } from './routes';

/*
 * The states of journey 12, React and reply, the mocks draw, for the parity specs and the
 * sweeps: `before` is the step before the page opens (the answers of the API and the hub),
 * `app` what brings the open page to the state (opening a message's actions, choosing a quote).
 */

interface ReactState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

/** The messages of the mock thread the states act on. */
export const lines = {
  walts: 'Pancakes at the main cabin, 8:30. Bring an appetite.',
  ellies: 'Can someone grab the paddles from the shed?',
  maras: 'On it! Also: last call for the canoe sign-up 🛶',
  ruths: 'Put me down for the 10 o’clock boat, please',
} as const;

async function openActions(page: Page, text: string): Promise<void> {
  await new MessageActions(page).openByKeyboard(new GroupChatPage(page).message(text));
  await new ReactionsDialog(page).panel.waitFor();
}

export const reactStates = {
  groupChat: { before: (page) => theMockChat(page) },
  // Mara replies to Ruth: the reply bar above the field, as the default mock draws it.
  groupChatReplying: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      await openActions(page, lines.ruths);
      await new ReactionsDialog(page).reply.click();
      await new MessageActions(page).replyBar.waitFor();
    },
  },
  reactions: { before: (page) => theMockChat(page), app: (page) => openActions(page, lines.walts) },
  reactionsMine: {
    before: (page) => theMockChat(page),
    app: (page) => openActions(page, lines.maras),
  },
  reactionsMore: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      await openActions(page, lines.walts);
      const dialog = new ReactionsDialog(page);
      await dialog.moreReactions.click();
      await dialog.more.first().waitFor();
    },
  },
  deleteMessage: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      await openActions(page, lines.maras);
      await new ReactionsDialog(page).delete.click();
      await new DeleteMessageDialog(page).panel.waitFor();
    },
  },
  // Mara's quote went to Ellie's message, which is marked for 2 seconds; the app's state has
  // to hold the mark while the region is compared (a stubbed store or a paused clock).
  groupChatMarked: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      const chat = new GroupChatPage(page);
      await new MessageActions(page).quote(chat.message(lines.maras)).click();
      await chat.message(lines.ellies).first().and(page.locator('.msg--marked')).waitFor();
    },
  },
  groupChatDeletedQuote: { before: (page) => theMockChat(page) },
  groupChatReadOnly: wrapUpStates.groupChatReadOnly,
} satisfies Partial<Record<RouteKey | 'groupChatReplying', ReactState>>;
