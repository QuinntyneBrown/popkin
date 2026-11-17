import { parity } from '../../fixtures/parity';
import { LogEntryPage } from '../../pages/log-entry.page';
import { logAsDrawn } from './log-steps';

parity('kind-grid', [
  {
    key: 'logEntryMilestone',
    name: 'milestone',
    region: (page) => new LogEntryPage(page).kindGrid,
    before: logAsDrawn,
  },
]);
