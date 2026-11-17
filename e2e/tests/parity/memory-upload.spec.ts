import { parity } from '../../fixtures/parity';
import { AddMemoryDialog } from '../../pages/add-memory.dialog';
import { chooseTheCanoe, memoriesAsDrawn } from './memory-steps';

parity('memory-upload', [
  // The canoe chosen, before Save: its photo and name.
  {
    key: 'addMemoryChosen',
    region: (page) => new AddMemoryDialog(page).upload,
    before: memoriesAsDrawn,
    app: chooseTheCanoe,
    snap: true,
  },
]);
