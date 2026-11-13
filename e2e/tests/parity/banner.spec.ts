import { theMockPopkins, thePopkinsGoOffline } from '../../fixtures/my-popkins';
import { MyPopkinsPage } from '../../pages/my-popkins.page';
import { comeBackWithTwo, theMockChat, writeTwoOffline } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';
import { PopkinHomePage } from '../../pages/popkin-home.page';

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
  // A call is under way: the banner in the Popkin's colour, with Join at its end.
  {
    key: 'bannerInfo',
    name: 'call',
    region: (page) => new PopkinHomePage(page).callBanner,
    // The header above it ends on a fraction of a pixel.
    snap: true,
  },
]);
