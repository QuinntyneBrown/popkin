import {
  sendTheReplyToRuth,
  theChatLoading,
  theChatWhoseSendsFail,
  theMockChat,
  writeTwoOffline,
} from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// Reactions, replies and photos come with later journeys: the messages compared carry none.
parity('message', [
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
]);
