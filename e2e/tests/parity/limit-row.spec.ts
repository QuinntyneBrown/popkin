import { theMockDefaults } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

const before = async (page: import('@playwright/test').Page) => void (await theMockDefaults(page));
const row = (name: string) => (page: import('@playwright/test').Page) =>
  new NotificationsPage(page).defaultRow(name);

// The defaults of the Notifications page (L2-173): a projected control, one number, two times, a
// select, and a number with its error.
parity('limit-row', [
  { key: 'adminNotificationsDefaults', name: 'activity', region: row('Activity email'), before },
  {
    key: 'adminNotificationsDefaults',
    name: 'number',
    region: row('Bundle changes within'),
    before,
  },
  { key: 'adminNotificationsDefaults', name: 'times', region: row('Quiet hours'), before },
  { key: 'adminNotificationsDefaults', name: 'select', region: row('Birthday reminders'), before },
  {
    key: 'adminNotificationsDefaultsInvalid',
    name: 'invalid',
    region: row('Bundle changes within'),
    before,
    app: async (page) => {
      const view = new NotificationsPage(page);
      await view.activityEmail.getByRole('radio', { name: 'Daily digest' }).click();
      await view.bundle.fill('0');
    },
  },
]);
