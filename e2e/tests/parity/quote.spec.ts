import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { lines, reactStates } from '../../fixtures/react-states';
import { GroupChatPage } from '../../pages/group-chat.page';
import { MessageActions } from '../../pages/message-actions';
import { ReactionsDialog } from '../../pages/reactions.dialog';

const quoteOf = (page: Page, text: string) =>
  new MessageActions(page).quote(new GroupChatPage(page).message(text));

parity('quote', [
  // In a reply of mine: a button to Ellie's message (L2-025 AC3).
  {
    key: 'groupChat',
    ...reactStates.groupChat,
    name: 'live',
    region: (page) => quoteOf(page, lines.maras),
    snap: true,
  },
  // Its message was deleted: "Message deleted", not a button (L2-025 AC4).
  {
    key: 'groupChatDeletedQuote',
    ...reactStates.groupChatDeletedQuote,
    name: 'deleted',
    region: (page) => quoteOf(page, lines.maras),
    snap: true,
  },
  // At the top of the message actions, theirs and the member's own.
  {
    key: 'reactions',
    ...reactStates.reactions,
    name: 'actions',
    region: (page) => new ReactionsDialog(page).quote,
  },
  {
    key: 'reactionsMine',
    ...reactStates.reactionsMine,
    name: 'actions-mine',
    region: (page) => new ReactionsDialog(page).quote,
  },
]);
