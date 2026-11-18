import { theMockAdmins } from '../../fixtures/admin';
import { theMockHolds, theMockNotifications } from '../../fixtures/admin-notifications';
import { theMockHolidayCalendars } from '../../fixtures/holidays';
import { parity } from '../../fixtures/parity';
import { AdminHolidaysPage } from '../../pages/admin/holidays.page';
import { AdminsPage } from '../../pages/admin/admins.page';
import { NotificationsPage } from '../../pages/admin/notifications.page';

// People, roles chosen in place and an action per row: Admins & roles (L2-119 AC1).
parity('data-table', [
  // A year's holidays with their notes, estimated pills and "Change" (L2-196 AC4, L2-197 AC1).
  {
    key: 'adminHolidays',
    name: 'holidays',
    region: (page) => new AdminHolidaysPage(page).calendar.locator('.table-wrap'),
    before: theMockHolidayCalendars,
  },
  // The row being changed: a date field, "Confirmed" and "Done" (L2-197 AC1).
  {
    key: 'adminHolidaysChanging',
    name: 'holiday-changing',
    region: (page) => new AdminHolidaysPage(page).calendar.locator('.table-wrap'),
    before: theMockHolidayCalendars,
    app: async (page) =>
      new AdminHolidaysPage(page)
        .holiday('Ramadan begins')
        .getByRole('button', { name: /Change/ })
        .click(),
  },
  {
    key: 'adminAdmins',
    name: 'admins',
    region: (page) => new AdminsPage(page).tableWrap,
    before: theMockAdmins,
  },
  // Kinds in their groups, figures, a switch per kind and a locked kind (L2-169 AC4). The mock
  // draws no phone layout for AC5, where the figures go under the name, so 1280 px only.
  {
    key: 'adminNotifications',
    name: 'notification-kinds',
    region: (page) => new NotificationsPage(page).panel,
    before: async (page) => void (await theMockNotifications(page)),
    widths: [1280],
  },
  // Holds: a Popkin's tile, people's avatars and a photo, who and when, and "Automatic"
  // (L2-172 AC1, AC5).
  {
    key: 'adminNotificationsHolds',
    name: 'notification-holds',
    region: (page) => new NotificationsPage(page).held.locator('.data-table'),
    before: async (page) => void (await theMockHolds(page)),
  },
]);
