import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

const weeks = (page: import('@playwright/test').Page) => new TimeOffPage(page).weeks;

parity('week-chips', [
  { key: 'timeOff', name: 'event-week', region: weeks, before: theMockTimeOff, snap: true },
  {
    key: 'timeOffOtherWeek',
    name: 'other-week',
    region: weeks,
    before: theMockTimeOff,
    snap: true,
  },
]);
