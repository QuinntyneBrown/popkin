import { parity } from '../../fixtures/parity';
import { theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

// The files input draws nothing of its own: the device's picker is all there is to see. Its
// region is the album's main, which holds it, and matches the mock, which has no input. At
// 360 px the last row of photos is below the fold, where the app loads them lazily, so the
// album is compared at 1280 px.
parity('files-input', [
  {
    key: 'photoAlbum',
    name: 'hidden',
    region: (page) => new PhotoAlbumPage(page).main,
    before: theMockPhotos,
    widths: [1280],
  },
]);
