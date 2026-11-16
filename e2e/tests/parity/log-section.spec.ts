import { parity } from '../../fixtures/parity';
import { LogEntryPage } from '../../pages/log-entry.page';
import { fillAsDrawn, logAsDrawn } from './log-steps';

parity('log-section', [
  // "Anything you said you'd do?", its hint and one promise.
  {
    key: 'logEntry',
    name: 'promises',
    region: (page) => new LogEntryPage(page).promiseSection,
    before: logAsDrawn,
    app: fillAsDrawn,
    snap: true,
  },
  // "Worth remembering", set off by a hairline.
  {
    key: 'logEntry',
    name: 'divided',
    region: (page) => new LogEntryPage(page).remembering,
    before: logAsDrawn,
    app: fillAsDrawn,
    snap: true,
  },
]);
