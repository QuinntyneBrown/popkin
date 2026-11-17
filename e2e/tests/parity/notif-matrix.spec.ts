import { theMockNotificationSettings } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('notif-matrix', [
  // Each kind with its two switches (L2-157 AC1).
  {
    key: 'notificationSettings',
    name: 'switches',
    region: (page) => new NotificationSettingsPage(page).firstMatrix,
    before: theMockNotificationSettings,
  },
  // "Always on" with the lock (L2-157 AC2).
  {
    key: 'notificationSettings',
    name: 'always-on',
    region: (page) => new NotificationSettingsPage(page).accountMatrix,
    before: theMockNotificationSettings,
  },
]);
