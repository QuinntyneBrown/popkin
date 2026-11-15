import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

parity('plan-header', [
  // The views, the name and "Add my time off" (L2-072 AC1, L2-073 AC1).
  {
    key: 'timeOff',
    name: 'schedule',
    region: (page) => new TimeOffPage(page).header,
    before: theMockTimeOff,
  },
]);
