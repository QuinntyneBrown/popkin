import { parity } from '../../fixtures/parity';
import { theMockPhotos, thePhotoFailing, thePhotoLoading } from '../../fixtures/photos';
import { PhotoViewPage } from '../../pages/photo-view.page';

type Page = import('@playwright/test').Page;

// The view is compared part by part: the reactions, the comments and the react bar show what
// the page gives the viewer, and the mock's photo is the album's first.
parity('photo-viewer', [
  // Journey 14: Close, who and when, and "Save photo"; Joel's view, with no Photo actions
  // (L2-036 AC1, AC4).
  {
    key: 'photoViewMember',
    name: 'bar',
    region: (page: Page) => new PhotoViewPage(page).bar,
    before: theMockPhotos,
  },
  // "Comment", beside the react bar (L2-035 AC1).
  {
    key: 'photoView',
    name: 'comment',
    region: (page: Page) => new PhotoViewPage(page).comment,
    before: theMockPhotos,
  },
  // From 1024 px the side panel ends with the field "Add a comment" (L2-058 AC11).
  {
    key: 'photoView',
    name: 'field',
    region: (page: Page) => new PhotoViewPage(page).panelField,
    before: theMockPhotos,
    widths: [1280],
  },
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
  // The bar keeps "Save photo" while the photo loads. On a phone the mock names the author it
  // has not loaded yet, so the bar is compared where the panel names them.
  {
    key: 'photoViewLoading',
    name: 'loading-bar',
    region: (page: Page) => new PhotoViewPage(page).bar,
    before: thePhotoLoading,
    widths: [1280],
  },
  {
    key: 'photoViewLoading',
    name: 'loading',
    region: (page: Page) => new PhotoViewPage(page).stage,
    before: thePhotoLoading,
  },
]);
