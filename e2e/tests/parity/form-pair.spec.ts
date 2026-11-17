import { parity } from '../../fixtures/parity';
import { ContactFormPage } from '../../pages/contact-form.page';

parity('form-pair', [
  // Phone and Email side by side.
  {
    key: 'addContact',
    name: 'details',
    region: (page) => new ContactFormPage(page).firstPair,
    snap: true,
  },
]);
