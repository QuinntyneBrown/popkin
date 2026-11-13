import { parity } from '../../fixtures/parity';
import { theMockPhotos, thePhotoFailing, thePhotoLoading } from '../../fixtures/photos';
import { PhotoViewPage } from '../../pages/photo-view.page';

type Page = import('@playwright/test').Page;

// "Save photo", the reactions, the comments and the react bar are journey 14, so the view is
// compared by the parts that are built. The author in the bar of a phone is one that is not:
// without "Save photo" beside it, it is wider than the mock's.
parity('photo-viewer', [
  {
    key: 'photoView',
    name: 'author-beside',
    region: (page: Page) => new PhotoViewPage(page).panelBy,
    before: theMockPhotos,
    widths: [1280],
  },
  {
    key: 'photoView',
    name: 'caption',
    region: (page: Page) => new PhotoViewPage(page).captionRegion,
    before: theMockPhotos,
  },
  {
    key: 'photoView',
    name: 'photo',
    region: (page: Page) => new PhotoViewPage(page).stage,
    before: theMockPhotos,
    widths: [1280],
  },
  {
    key: 'photoViewError',
    name: 'error',
    region: (page: Page) => new PhotoViewPage(page).error,
    before: thePhotoFailing,
  },
  {
    key: 'photoViewLoading',
    name: 'loading',
    region: (page: Page) => new PhotoViewPage(page).stage,
    before: thePhotoLoading,
  },
]);
