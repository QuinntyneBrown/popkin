import type { Page } from '@playwright/test';
import { lakesideInvite, withShareSheet } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

const phone = async (page: Page) => {
  await lakesideInvite(page);
  await withShareSheet(page);
};

parity('share-actions', [
  {
    key: 'popkinCreated',
    name: 'with-share',
    region: (page) => new PopkinCreatedPage(page).shareActions,
    before: phone,
  },
  {
    key: 'popkinCreatedCopied',
    name: 'copied',
    region: (page) => new PopkinCreatedPage(page).shareActions,
    before: phone,
    app: async (page) => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await new PopkinCreatedPage(page).copyLink.click();
    },
  },
]);
