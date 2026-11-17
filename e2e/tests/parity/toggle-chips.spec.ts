import { parity } from '../../fixtures/parity';
import { marasGroups } from '../../fixtures/groups';
import { ContactFormPage } from '../../pages/contact-form.page';

parity('toggle-chips', [
  // Mara's groups to put someone in, Sheffield lot pressed as the mock draws it.
  {
    key: 'addContact',
    name: 'groups',
    region: (page) => new ContactFormPage(page).groups,
    before: marasGroups,
    app: (page) => new ContactFormPage(page).group('Sheffield lot').click(),
    snap: true,
  },
]);
