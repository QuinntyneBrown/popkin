import { parity } from '../../fixtures/parity';
import { theAlbumLoading, theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

const firstGrid = (page: import('@playwright/test').Page) => new PhotoAlbumPage(page).firstGrid;

parity('photo-grid', [
  { key: 'photoAlbum', name: 'feature', region: firstGrid, before: theMockPhotos },
  {
    key: 'photoAlbumMine',
    name: 'one',
    region: firstGrid,
    before: theMockPhotos,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
  },
  { key: 'photoAlbumLoading', name: 'loading', region: firstGrid, before: theAlbumLoading },
]);
