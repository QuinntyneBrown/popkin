import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { memoriesAsDrawn } from './memory-steps';

parity('memory-list', [
  // Two files, by their month and size, and the gift ideas note.
  {
    key: 'contactProfileMemories',
    region: (page) => new ContactProfilePage(page).memoryList,
    before: memoriesAsDrawn,
    snap: true,
  },
]);
