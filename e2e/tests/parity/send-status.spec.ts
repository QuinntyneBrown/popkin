import {
  theMockNotifications,
  theMockNotificationsPaused,
} from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

const status = (page: Parameters<typeof theMockNotifications>[0]) =>
  new NotificationsPage(page).status;

parity('send-status', [
  // Email is sending, with the day's totals (L2-169 AC2).
  {
    key: 'adminNotifications',
    name: 'sending',
    region: status,
    before: async (page) => void (await theMockNotifications(page)),
  },
  // Paused: the coral panel, what is queued and why (L2-169 AC3).
  {
    key: 'adminNotificationsPaused',
    name: 'paused',
    region: status,
    before: theMockNotificationsPaused,
  },
]);
