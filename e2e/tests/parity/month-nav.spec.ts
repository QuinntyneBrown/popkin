import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

const monthNav = (page: import('@playwright/test').Page) => new TimeOffPage(page).monthNav;

parity('month-nav', [
  { key: 'timeOff', name: 'event-week', region: monthNav, before: theMockTimeOff, snap: true },
  // "Go to Cabin week" while another week is chosen (L2-072 AC7).
  {
    key: 'timeOffOtherWeek',
    name: 'other-week',
    region: monthNav,
    before: theMockTimeOff,
    snap: true,
  },
]);
