import { theMockDefaults } from '../../fixtures/admin-notifications';
import { parity } from '../../fixtures/parity';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// What "Save new defaults?" saves (L2-173 AC4): the old value struck through, then the new one.
parity('change-list', [
  {
    key: 'adminSaveDefaults',
    name: 'defaults',
    region: (page) => page.locator('.change-list'),
    before: async (page) => void (await theMockDefaults(page)),
    app: async (page) => {
      const view = new NotificationsPage(page);
      await view.activityEmail.getByRole('radio', { name: 'Daily digest' }).click();
      await view.bundle.fill('20');
      await view.saveDefaults.click();
    },
  },
]);
