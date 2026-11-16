import { parity } from '../../fixtures/parity';
import { ContactFormPage } from '../../pages/contact-form.page';

// The sections of the contact form built so far. "Dates to remember", "How they connect" and
// "Groups" join with Key dates, Connections and Groups, and the whole form is compared then.
// Edit's sections join with "Delete {first name}" (Delete a contact): until it follows them,
// "Details" is the form's last section and draws no rule under it, as Add someone's does.
parity('form-sections', [
  {
    key: 'addContact',
    name: 'who',
    region: (page) => new ContactFormPage(page).who,
    snap: true,
    // The mock draws Femi typed in.
    app: async (page) => {
      const form = new ContactFormPage(page);
      await form.name.fill('Femi Bankole');
      await form.knownAs.fill('Grace’s fiancé');
      await form.circleChoice('Friends').click();
    },
  },
  {
    key: 'addContact',
    name: 'details',
    region: (page) => new ContactFormPage(page).details,
  },
]);
