import { expect } from '@playwright/test';
import { theMockHolds } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// "Hold a Popkin" open: the search, focused, and the Popkins that can be held (L2-172 AC2).
parity('popover', [
  {
    key: 'adminNotificationsHoldAdding',
    name: 'hold-a-popkin',
    region: (page) => page.locator('.popover'),
    before: async (page) => void (await theMockHolds(page)),
    app: async (page) => {
      const view = new NotificationsPage(page);
      await view.holdAPopkin.click();
      await expect(view.holdMatches).toHaveCount(5);
    },
  },
]);
