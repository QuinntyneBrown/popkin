import { theMockHolds, theMockNotifications } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// "Off for everyone" beside a kind switched off (L2-171 AC2).
parity('status', [
  {
    key: 'adminNotifications',
    name: 'bad',
    region: (page) => new NotificationsPage(page).kind('Experiences').off,
    before: async (page) => void (await theMockNotifications(page)),
  },
  // "Automatic" at the end of a hold no admin releases (L2-172 AC5).
  {
    key: 'adminNotificationsHolds',
    name: 'neutral',
    region: (page) => new NotificationsPage(page).hold('Ruth Lindqvist').automatic,
    before: async (page) => void (await theMockHolds(page)),
  },
]);
