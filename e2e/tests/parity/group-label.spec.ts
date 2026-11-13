import { ConversationsPage } from '../../pages/conversations.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

parity('group-label', [
  {
    key: 'photoAlbum',
    name: 'first',
    region: (page) => new PhotoAlbumPage(page).days.first(),
    before: theMockPhotos,
  },
  {
    key: 'photoAlbum',
    name: 'later',
    region: (page) => new PhotoAlbumPage(page).days.nth(1),
    before: theMockPhotos,
  },
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'direct-messages',
    region: (page) => new ConversationsPage(page).directLabel,
  },
]);
