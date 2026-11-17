import { parity } from '../../fixtures/parity';
import { ContactFormPage } from '../../pages/contact-form.page';

parity('form-section', [
  // Details, with its hint.
  {
    key: 'addContact',
    name: 'details',
    region: (page) => new ContactFormPage(page).details,
    snap: true,
  },
]);
