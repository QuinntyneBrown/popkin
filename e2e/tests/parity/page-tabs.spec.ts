import { theMockNotifications } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// Notifications' "Kinds 12", "Holds 4" and "Defaults", Kinds chosen (L2-169 AC1).
parity('page-tabs', [
  {
    key: 'adminNotifications',
    name: 'kinds',
    region: (page) => new NotificationsPage(page).pageTabs,
    before: async (page) => void (await theMockNotifications(page)),
  },
]);
