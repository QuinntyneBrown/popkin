import { parity } from '../../fixtures/parity';
import { theMockPhotos, thePhotoFailing, thePhotoLoading } from '../../fixtures/photos';
import {
  theDockAsDrawn,
  theDockRemoved,
  theDockWithMyComment,
  theDockWrappedUp,
} from '../../fixtures/photo-talk';
import { PhotoViewPage } from '../../pages/photo-view.page';

type Page = import('@playwright/test').Page;

const v = (page: Page) => new PhotoViewPage(page);

// The view is compared part by part: the reactions, the comments and the react bar show what
// the page gives the viewer, and the mock's photo is the album's first.
parity('photo-viewer', [
  // Journey 14, with the page's data: Photo actions, the chips, the react bar, the tools.
  {
    key: 'photoView',
    name: 'bar-actions',
    region: (page: Page) => v(page).bar,
    before: theDockAsDrawn,
  },
  {
    key: 'photoView',
    name: 'chips',
    region: (page: Page) => v(page).panel.locator('.photo-info__counts, :scope > .cluster').first(),
    before: theDockAsDrawn,
  },
  {
    key: 'photoView',
    name: 'react-bar',
    region: (page: Page) => v(page).reactBar,
    before: theDockAsDrawn,
  },
  {
    key: 'photoView',
    name: 'tools',
    region: (page: Page) => v(page).panel.locator('.photo-info__tools, :scope > .cluster').last(),
    before: theDockAsDrawn,
  },
  // A comment of one's own, with Delete comment, in the side panel (L2-035 AC5).
  {
    key: 'photoViewOwnComment',
    name: 'own-comment',
    region: (page: Page) => v(page).panelComments.locator('.comment').last(),
    before: theDockWithMyComment,
    widths: [1280],
    snap: true,
  },
  {
    key: 'photoViewOwnComment',
    name: 'first-comment',
    region: (page: Page) => v(page).panelComments.locator('.comment').first(),
    before: theDockWithMyComment,
    widths: [1280],
    snap: true,
  },
  {
    key: 'photoViewOwnComment',
    name: 'panel',
    region: (page: Page) => v(page).panel,
    before: theDockWithMyComment,
    widths: [1280],
    snap: true,
  },
  // A wrapped-up Popkin: read-only (L2-045).
  {
    key: 'photoViewWrapped',
    name: 'wrapped-bar',
    region: (page: Page) => v(page).bar,
    before: theDockWrappedUp,
  },
  {
    key: 'photoViewWrapped',
    name: 'wrapped-panel',
    region: (page: Page) => v(page).panel,
    before: theDockWrappedUp,
    widths: [1280],
    snap: true,
  },
  {
    key: 'photoViewWrapped',
    name: 'wrapped-info',
    region: (page: Page) => v(page).panel,
    before: theDockWrappedUp,
    widths: [360],
  },
  // A photo deleted while it was open (L2-036 AC3).
  {
    key: 'photoViewRemoved',
    name: 'removed-bar',
    region: (page: Page) => v(page).bar,
    before: theDockRemoved,
  },
  {
    key: 'photoViewRemoved',
    name: 'removed',
    region: (page: Page) => v(page).removed,
    before: theDockRemoved,
  },
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
