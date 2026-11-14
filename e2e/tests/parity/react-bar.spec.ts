import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { maraOnTheDock, theDockAsDrawn } from '../../fixtures/photo-talk';
import { PhotoViewPage } from '../../pages/photo-view.page';

const reactBar = (page: Page) => new PhotoViewPage(page).reactBar;

// The react bar of the photo view: Mara's heart pressed, then none of hers (L2-034 AC1, AC2).
parity('react-bar', [
  { key: 'photoView', name: 'reacted', region: reactBar, before: theDockAsDrawn },
  {
    key: 'photoViewNotReacted',
    name: 'not-reacted',
    region: reactBar,
    before: (page) => maraOnTheDock(page).then(() => undefined),
  },
]);
