import type { Page } from '@playwright/test';
import {
  sendTheReplyToRuth,
  theChatLoading,
  theChatWhoseSendsFail,
  theMockChat,
  writeTwoOffline,
} from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { lines, reactStates } from '../../fixtures/react-states';
import { GroupChatPage } from '../../pages/group-chat.page';
import { devsPhotoLine } from '../../fixtures/chat-photo-states';
import { dockPhoto } from '../../fixtures/chat';

/** Dev's photo was deleted: his message reads "Photo removed" (L2-036 AC3). */
const devsPhotoRemoved = (page: Page) =>
  theMockChat(page, (chat) => {
    chat.messages = chat.messages.map((said) =>
      said.photo?.id === dockPhoto.id ? { ...said, photo: null, photoRemoved: true } : said,
    );
  });

const chat = (page: Page) => new GroupChatPage(page);

parity('message', [
  {
    key: 'groupChatPhotoRemoved',
    name: 'photo-removed',
    region: (page: Page) => chat(page).message(devsPhotoLine).locator('.bubble'),
    before: devsPhotoRemoved,
    snap: true,
  },
  {
    key: 'groupChat',
    name: 'theirs',
    region: (page) => new GroupChatPage(page).message('Can someone grab the paddles').first(),
    before: theMockChat,
  },
  {
    key: 'groupChatFailedSend',
    name: 'not-sent',
    region: (page) => new GroupChatPage(page).message('You’re on the list, Ruth!'),
    before: theChatWhoseSendsFail,
    app: sendTheReplyToRuth,
    snap: true,
  },
  {
    key: 'groupChatOffline',
    name: 'waiting',
    region: (page) => new GroupChatPage(page).message('Back at the dock in ten.'),
    before: theMockChat,
    app: writeTwoOffline,
    snap: true,
  },
  {
    key: 'groupChatLoading',
    name: 'loading',
    region: (page) => new GroupChatPage(page).skeletonRows,
    before: theChatLoading,
  },
  // Journey 12: the chips under theirs, one of them the member's own (L2-024 AC2).
  {
    key: 'groupChat',
    ...reactStates.groupChat,
    name: 'reactions',
    region: (page) => chat(page).message(lines.walts),
  },
  // A reply of mine with its quote (L2-025 AC2).
  {
    key: 'groupChat',
    ...reactStates.groupChat,
    name: 'reply',
    region: (page) => chat(page).message(lines.maras),
    snap: true,
  },
  // The message a quote went to, tinted and outlined (L2-025 AC3).
  {
    key: 'groupChatMarked',
    ...reactStates.groupChatMarked,
    name: 'marked',
    region: (page) => chat(page).message(lines.ellies).first(),
    snap: true,
  },
  // A reply whose quoted message was deleted (L2-025 AC4).
  {
    key: 'groupChatDeletedQuote',
    ...reactStates.groupChatDeletedQuote,
    name: 'deleted-quote',
    region: (page) => chat(page).message(lines.maras),
    snap: true,
  },
  // Wrapped up: the chips are words, not buttons, and the message opens no actions (L2-045).
  {
    key: 'groupChatReadOnly',
    ...reactStates.groupChatReadOnly,
    name: 'read-only-reactions',
    region: (page) => chat(page).message(lines.walts),
  },
  // Journey 13: Dev's photo, a link to the photo view, with his text under it (L2-026 AC2).
  {
    key: 'groupChat',
    before: theMockChat,
    name: 'photo',
    region: (page) => chat(page).message(devsPhotoLine),
    snap: true,
  },
]);
