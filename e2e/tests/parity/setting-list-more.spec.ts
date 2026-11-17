import { theMockMutedPeople } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('setting-list-more', [
  // "Show all 7 contacts with birthdays" under the first five (L2-159 AC2).
  {
    key: 'notificationSettingsPeople',
    name: 'show-all',
    region: (page) => new NotificationSettingsPage(page).birthdaysMore,
    before: theMockMutedPeople,
  },
]);
