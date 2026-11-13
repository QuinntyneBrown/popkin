import { thePopkinsEmpty, thePopkinsFailing } from '../../fixtures/my-popkins';
import { MyPopkinsPage } from '../../pages/my-popkins.page';
import { OfflinePage } from '../../pages/offline.page';
import { theHomeEmpty, theHomeFailing } from '../../fixtures/home';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { theChatEmpty, theChatFailing } from '../../fixtures/chat';
import { inviteFailsOnTheServer, theInviteFailing } from '../../fixtures/journeys';
import { GroupChatPage } from '../../pages/group-chat.page';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { ServerErrorPage } from '../../pages/server-error.page';
import { parity } from '../../fixtures/parity';
import { NotFoundPage } from '../../pages/not-found.page';

parity('empty-state', [
  { key: 'notFound', region: (page) => new NotFoundPage(page).emptyState },
  {
    key: 'serverErrorWithReference',
    name: 'server-error',
    region: (page) => new ServerErrorPage(page).emptyState,
    before: inviteFailsOnTheServer,
  },
  {
    key: 'joinInviteError',
    name: 'invite-error',
    region: (page) => new JoinInvitePage(page).emptyState,
    before: theInviteFailing,
  },
  {
    key: 'groupChatEmpty',
    name: 'quiet-chat',
    region: (page) => new GroupChatPage(page).empty,
    before: theChatEmpty,
  },
  {
    key: 'groupChatError',
    name: 'chat-error',
    region: (page) => new GroupChatPage(page).empty,
    before: theChatFailing,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'compact-tile',
    region: (page) => new PopkinHomePage(page).chatEmpty,
    before: theHomeEmpty,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'compact-sub',
    region: (page) => new PopkinHomePage(page).photosEmpty,
    before: theHomeEmpty,
  },
  {
    key: 'popkinHomeError',
    name: 'home-error',
    region: (page) => new PopkinHomePage(page).error,
    before: theHomeFailing,
  },
  {
    key: 'myPopkinsEmpty',
    name: 'no-popkins',
    region: (page) => new MyPopkinsPage(page).emptyState,
    before: thePopkinsEmpty,
  },
  {
    key: 'myPopkinsError',
    name: 'popkins-error',
    region: (page) => new MyPopkinsPage(page).emptyState,
    before: thePopkinsFailing,
  },
  { key: 'offline', name: 'offline', region: (page) => new OfflinePage(page).emptyState },
]);
