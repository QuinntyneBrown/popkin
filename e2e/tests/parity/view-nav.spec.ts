import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

parity('view-nav', [
  {
    key: 'timeOff',
    name: 'time-off',
    region: (page) => new TimeOffPage(page).views,
    before: theMockTimeOff,
  },
]);
