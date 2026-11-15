import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

parity('chart-legend', [
  {
    key: 'timeOff',
    name: 'time-off',
    region: (page) => new TimeOffPage(page).legend,
    before: theMockTimeOff,
    snap: true,
  },
]);
