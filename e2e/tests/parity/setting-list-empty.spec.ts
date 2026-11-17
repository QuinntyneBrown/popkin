import { theMockMutedPeople } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('setting-list-empty', [
  // "No one’s muted. You hear about everyone in your Popkins." (L2-160).
  {
    key: 'notificationSettingsNoOneMuted',
    name: 'no-one-muted',
    region: (page) => new NotificationSettingsPage(page).noOneMuted,
    before: (page) => theMockMutedPeople(page, []),
    snap: true,
  },
]);
