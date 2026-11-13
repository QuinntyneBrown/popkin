import { comeBackWithTwo, theMockChat, writeTwoOffline } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('banner', [
  {
    key: 'bannerDanger',
    name: 'offline',
    region: (page) => new GroupChatPage(page).banner,
    before: theMockChat,
    app: writeTwoOffline,
  },
  {
    key: 'bannerSuccess',
    name: 'back-online',
    region: (page) => new GroupChatPage(page).banner,
    before: theMockChat,
    app: comeBackWithTwo,
  },
]);
