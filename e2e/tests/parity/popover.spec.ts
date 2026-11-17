import { expect } from '@playwright/test';
import { theMockHolds } from '../../fixtures/admin-notifications';
import { theMockMutedPeople } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('popover', [
  // "Hold a Popkin" open: the search, focused, and the Popkins that can be held (L2-172 AC2).
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
  // "Mute someone" open: the search and five people who share a Popkin (L2-160 AC2).
  {
    key: 'notificationSettingsMuteSearch',
    name: 'mute-someone',
    region: (page) => new NotificationSettingsPage(page).popover,
    before: theMockMutedPeople,
    app: (page) => new NotificationSettingsPage(page).openPicker(),
    snap: true,
  },
]);
