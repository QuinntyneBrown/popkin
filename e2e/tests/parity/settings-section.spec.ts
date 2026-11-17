import { theMockNotificationSettings } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('settings-section', [
  // "Email me about activity", its "Email" switch and the frequency (L2-156 AC1).
  {
    key: 'notificationSettings',
    name: 'email',
    region: (page) => new NotificationSettingsPage(page).emailSection,
    before: theMockNotificationSettings,
  },
]);
