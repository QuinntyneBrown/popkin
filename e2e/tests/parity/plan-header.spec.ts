import { parity } from '../../fixtures/parity';
import { theMockThisWeek, theMockTimeOff } from '../../fixtures/schedule';
import { ThisWeekPage } from '../../pages/this-week.page';
import { TimeOffPage } from '../../pages/time-off.page';

parity('plan-header', [
  // The views, the name and "Add my time off" (L2-072 AC1, L2-073 AC1).
  {
    key: 'timeOff',
    name: 'schedule',
    region: (page) => new TimeOffPage(page).header,
    before: theMockTimeOff,
  },
  // This week: the views, the seven days and "My hours" (L2-074 AC1, AC8).
  {
    key: 'thisWeek',
    name: 'this-week',
    region: (page) => new ThisWeekPage(page).header,
    before: theMockThisWeek,
  },
]);
