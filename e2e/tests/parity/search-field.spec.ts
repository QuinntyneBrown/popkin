import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { NewMessageDialog } from '../../pages/new-message.dialog';

parity('search-field', [
  {
    key: 'newMessage',
    ...directMessageStates.newMessage,
    name: 'empty',
    region: (page) => new NewMessageDialog(page).searchField,
    // The mock's field has `autofocus`, so its focus ring shows.
    prepare: (page) => new NewMessageDialog(page).search.focus(),
  },
  {
    key: 'newMessageNoResults',
    ...directMessageStates.newMessageNoResults,
    name: 'typed',
    region: (page) => new NewMessageDialog(page).searchField,
    // The mock's field has `autofocus`, so its focus ring shows.
    prepare: (page) => new NewMessageDialog(page).search.focus(),
  },
]);
