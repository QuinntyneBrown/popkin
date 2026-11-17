import { theMockHolds } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// The sentence that ends Holds (L2-172 AC6).
parity('aside-note', [
  {
    key: 'adminNotificationsHolds',
    name: 'held',
    region: (page) => new NotificationsPage(page).heldNote,
    before: async (page) => void (await theMockHolds(page)),
  },
]);
