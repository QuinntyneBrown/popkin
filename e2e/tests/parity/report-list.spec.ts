import { theMockHolidayCalendars } from '../../fixtures/holidays';
import { parity } from '../../fixtures/parity';
import { AdminHolidaysPage } from '../../pages/admin/holidays.page';

parity('report-list', [
  {
    key: 'adminHolidays',
    name: 'holiday-calendars',
    before: theMockHolidayCalendars,
    region: (page) => new AdminHolidaysPage(page).list,
  },
]);
