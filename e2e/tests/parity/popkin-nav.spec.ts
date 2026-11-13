import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

// On a phone a thread shows no tabs (L2-058 AC8); the sidebar is there from 1024 px.
parity('popkin-nav', [
  {
    key: 'groupChat',
    name: 'sidebar',
    region: (page) => new GroupChatPage(page).nav,
    before: theMockChat,
    widths: [1280],
  },
  // A wrapped-up Popkin: no time left and nothing unread.
  {
    key: 'photoAlbumWrapped',
    ...wrapUpStates.photoAlbumWrapped,
    name: 'wrapped',
    region: (page) => new PhotoAlbumPage(page).nav,
  },
]);
