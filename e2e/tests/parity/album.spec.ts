import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { albumOf, theAlbumEmpty, theAlbumLoading, theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

// The days of the album are its group labels and photo grids, compared in their own specs;
// what is the album's own is the room it gives a state that stands in for them.
parity('album', [
  {
    key: 'photoAlbumLoading',
    name: 'loading',
    region: (page: Page) => new PhotoAlbumPage(page).albumSkeleton,
    before: theAlbumLoading,
  },
  {
    key: 'photoAlbumEmpty',
    name: 'empty',
    region: (page: Page) => new PhotoAlbumPage(page).empty,
    before: theAlbumEmpty,
  },
  {
    key: 'photoAlbumError',
    name: 'error',
    region: (page: Page) => new PhotoAlbumPage(page).empty,
    // The mock draws the album's counts over the failure: it had loaded before this read failed.
    before: theMockPhotos,
    app: async (page) => {
      await new PhotoAlbumPage(page).thumbnails.first().waitFor();
      albumOf(page).fail('album');
      await new PhotoAlbumPage(page).mine.click();
    },
  },
]);
