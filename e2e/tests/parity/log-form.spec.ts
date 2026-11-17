import { parity } from '../../fixtures/parity';
import { LogEntryPage } from '../../pages/log-entry.page';
import { fillAsDrawn, logAsDrawn } from './log-steps';

parity('log-form', [
  {
    key: 'logEntry',
    name: 'conversation',
    region: (page) => new LogEntryPage(page).form,
    before: logAsDrawn,
    app: fillAsDrawn,
  },
]);
