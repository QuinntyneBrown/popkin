import path from 'node:path';
import { joelAtTheMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { YourProfilePage } from '../../pages/your-profile.page';

const portrait = path.join(__dirname, '../../../docs/mocks/assets/images/call3.jpg');

parity('photo-picker', [
  {
    key: 'yourProfile',
    name: 'initial',
    region: (page) => new YourProfilePage(page).photo,
    before: joelAtTheMockInvite,
  },
  {
    key: 'yourProfileWithPhoto',
    name: 'photo',
    region: (page) => new YourProfilePage(page).photo,
    before: joelAtTheMockInvite,
    app: (page) => new YourProfilePage(page).choosePhoto(portrait),
  },
  {
    key: 'yourProfileInvalid',
    name: 'no-name',
    region: (page) => new YourProfilePage(page).photo,
    before: joelAtTheMockInvite,
    app: (page) => new YourProfilePage(page).name.fill(''),
  },
]);
