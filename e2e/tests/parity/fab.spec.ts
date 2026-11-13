import { parity } from '../../fixtures/parity';
import { theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

// The floating action is a phone's; from 768 px the header holds "Add photos".
parity('fab', [
  {
    key: 'photoAlbum',
    name: 'add',
    region: (page) => new PhotoAlbumPage(page).fab,
    before: theMockPhotos,
    widths: [360],
  },
]);
