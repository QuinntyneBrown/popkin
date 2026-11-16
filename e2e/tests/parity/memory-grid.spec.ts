import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { memoriesAsDrawn } from './memory-steps';

parity('memory-grid', [
  // Four photos, each with its caption and day.
  {
    key: 'contactProfileMemories',
    region: (page) => new ContactProfilePage(page).memoryGrid,
    before: memoriesAsDrawn,
    snap: true,
  },
]);
