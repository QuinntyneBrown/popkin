import { DirectMessagePage } from '../../pages/direct-message.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { theMockPopkins, thePopkinsGoOffline } from '../../fixtures/my-popkins';
import { MyPopkinsPage } from '../../pages/my-popkins.page';
import { comeBackWithTwo, theMockChat, writeTwoOffline } from '../../fixtures/chat';
import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { WrapUpBanner } from '../../pages/wrap-up-banner';

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
    ...callStates.bannerInfo,
    name: 'call',
    region: (page) => new PopkinHomePage(page).callBanner,
    // The header above it ends on a fraction of a pixel.
    snap: true,
  },
  // One hour left: the Host's has "Change" before Dismiss.
  {
    key: 'popkinHomeLastHour',
    ...wrapUpStates.popkinHomeLastHour,
    name: 'last-hour',
    region: (page) => new WrapUpBanner(page).root,
    snap: true,
  },
  // Under an hour, a member's: the time left, and Dismiss alone.
  {
    key: 'popkinHomeLastHourMember',
    ...wrapUpStates.popkinHomeLastHourMember,
    name: 'last-hour-member',
    region: (page) => new WrapUpBanner(page).root,
    snap: true,
  },
  // The album was not kept: it stays until the photos go.
  {
    key: 'photoAlbumGoing',
    ...wrapUpStates.photoAlbumGoing,
    name: 'photos-go',
    region: (page) => new WrapUpBanner(page).root,
  },
  {
    key: 'recapGoing',
    ...wrapUpStates.recapGoing,
    name: 'photos-go-recap',
    region: (page) => new WrapUpBanner(page).root,
  },
  {
    key: 'directMessageCall',
    ...directMessageStates.directMessageCall,
    name: 'direct-call',
    region: (page) => new DirectMessagePage(page).callBanner,
  },
]);
