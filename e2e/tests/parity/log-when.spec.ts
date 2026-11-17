import { parity } from '../../fixtures/parity';
import { LogEntryPage } from '../../pages/log-entry.page';
import { logAsDrawn } from './log-steps';

parity('log-when', [
  // "Today, 8:40 am" beside how they talked.
  {
    key: 'logEntry',
    name: 'today',
    region: (page) => new LogEntryPage(page).when,
    before: logAsDrawn,
  },
]);
