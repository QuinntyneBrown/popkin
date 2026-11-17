import { parity } from '../../fixtures/parity';
import { LogEntryPage } from '../../pages/log-entry.page';
import { fillAsDrawn, logAsDrawn } from './log-steps';

parity('promise', [
  {
    key: 'logEntry',
    name: 'log',
    region: (page) => new LogEntryPage(page).promises.first(),
    before: logAsDrawn,
    app: fillAsDrawn,
    snap: true,
  },
]);
