import { theMockPopkins, thePopkinsGoOffline } from '../../fixtures/my-popkins';
import { MyPopkinsPage } from '../../pages/my-popkins.page';
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
  {
    key: 'myPopkinsOffline',
    name: 'saved-list',
    region: (page) => new MyPopkinsPage(page).offlineBanner,
    before: theMockPopkins,
    app: thePopkinsGoOffline,
  },
]);
