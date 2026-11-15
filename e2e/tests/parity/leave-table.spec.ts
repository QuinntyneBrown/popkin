import { parity } from '../../fixtures/parity';
import { theMockTimeOff, theTimeOffConfirmed, theTimeOffEmpty } from '../../fixtures/schedule';
import { TimeOffPage } from '../../pages/time-off.page';

const table = (page: import('@playwright/test').Page) => new TimeOffPage(page).tableWrap;

parity('leave-table', [
  { key: 'timeOff', name: 'event', region: table, before: theMockTimeOff, snap: true },
  { key: 'timeOffEmpty', name: 'empty', region: table, before: theTimeOffEmpty, snap: true },
  {
    key: 'timeOffConfirmed',
    name: 'confirmed',
    region: table,
    before: theTimeOffConfirmed,
    snap: true,
  },
]);
