import { NewMessageDialog } from '../../pages/new-message.dialog';
import { ConversationsPage } from '../../pages/conversations.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';
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
import { PhotoAlbumPage } from '../../pages/photo-album.page';

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
  {
    key: 'experienceDetailError',
    ...experienceStates.experienceDetailError,
    name: 'experience-error',
    region: (page) => new ExperienceDetailPage(page).error,
  },
  // The album was not kept and its 30 days are over.
  {
    key: 'photoAlbumRemoved',
    ...wrapUpStates.photoAlbumRemoved,
    name: 'photos-removed',
    region: (page) => new PhotoAlbumPage(page).empty,
  },
  {
    key: 'conversationsEmpty',
    ...directMessageStates.conversationsEmpty,
    name: 'no-direct-messages',
    region: (page) => new ConversationsPage(page).empty,
  },
  {
    key: 'conversationsError',
    ...directMessageStates.conversationsError,
    name: 'chats-error',
    region: (page) => new ConversationsPage(page).error,
  },
  {
    key: 'newMessageNoResults',
    ...directMessageStates.newMessageNoResults,
    name: 'nobody-by-that-name',
    region: (page) => new NewMessageDialog(page).noResults,
  },
]);
