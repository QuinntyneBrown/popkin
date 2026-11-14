import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { theDockAsDrawn } from '../../fixtures/photo-talk';
import { PhotoViewPage } from '../../pages/photo-view.page';

// "Comment", the button on the photo's stage beside the react bar (L2-035 AC1).
parity('stage-button', [
  {
    key: 'photoView',
    name: 'comment',
    region: (page: Page) => new PhotoViewPage(page).comment,
    before: theDockAsDrawn,
  },
]);
