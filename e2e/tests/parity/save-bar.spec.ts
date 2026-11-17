import type { Page } from '@playwright/test';
import { theMockDefaults } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

const before = async (page: Page) => void (await theMockDefaults(page));
const region = (page: Page) => new NotificationsPage(page).saveBar;
const dailyDigest = (page: Page) =>
  new NotificationsPage(page).activityEmail.getByRole('radio', { name: 'Daily digest' }).click();

// The bar under the defaults of the Notifications page (L2-173): two unsaved changes, and a value
// to fix first.
parity('save-bar', [
  {
    key: 'adminNotificationsDefaultsEdited',
    name: 'unsaved',
    region,
    before,
    app: async (page) => {
      await dailyDigest(page);
      await new NotificationsPage(page).bundle.fill('20');
    },
  },
  {
    key: 'adminNotificationsDefaultsInvalid',
    name: 'blocked',
    region,
    before,
    app: async (page) => {
      await dailyDigest(page);
      await new NotificationsPage(page).bundle.fill('0');
    },
  },
]);
