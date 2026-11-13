import { parity } from '../../fixtures/parity';
import {
  theAlbumEmpty,
  theAlbumLoading,
  theAlbumWithoutMine,
  theMockPhotos,
} from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

const header = (page: import('@playwright/test').Page) => new PhotoAlbumPage(page).header;

parity('tab-header', [
  { key: 'photoAlbum', name: 'filters', region: header, before: theMockPhotos },
  {
    key: 'photoAlbumMine',
    name: 'mine',
    region: header,
    before: theMockPhotos,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
  },
  {
    key: 'photoAlbumNoResults',
    name: 'no-results',
    region: header,
    before: theAlbumWithoutMine,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
  },
  { key: 'photoAlbumEmpty', name: 'empty', region: header, before: theAlbumEmpty },
  { key: 'photoAlbumLoading', name: 'loading', region: header, before: theAlbumLoading },
]);
