import { theMockNotificationSettings } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('notif-group', [
  // "When something changes", the column words over its matrix (L2-157 AC1).
  {
    key: 'notificationSettings',
    name: 'activity',
    region: (page) => new NotificationSettingsPage(page).firstGroup,
    before: theMockNotificationSettings,
  },
]);
