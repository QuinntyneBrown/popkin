import { theMockHolidayCalendars } from '../../fixtures/holidays';
import { parity } from '../../fixtures/parity';
import { AdminHolidaysPage } from '../../pages/admin/holidays.page';

parity('key-values', [
  {
    key: 'adminHolidays',
    name: 'holiday-calendar',
    before: theMockHolidayCalendars,
    region: (page) => new AdminHolidaysPage(page).figures,
  },
]);
