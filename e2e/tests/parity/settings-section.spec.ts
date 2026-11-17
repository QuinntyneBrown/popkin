import { theMockMutedPeople } from '../../fixtures/notifications';
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
  // A smaller section of a view, with an action at its head: "Muted people" (L2-160).
  {
    key: 'notificationSettingsPeople',
    name: 'muted-people',
    region: (page) => new NotificationSettingsPage(page).mutedSection,
    before: theMockMutedPeople,
    snap: true,
  },
]);
