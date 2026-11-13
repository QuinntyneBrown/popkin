import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { NewMessageDialog } from '../../pages/new-message.dialog';

parity('member-picker', [
  {
    key: 'newMessage',
    ...directMessageStates.newMessage,
    name: 'members',
    region: (page) => new NewMessageDialog(page).list,
  },
  {
    key: 'newMessageNoResults',
    ...directMessageStates.newMessageNoResults,
    name: 'no-results',
    region: (page) => new NewMessageDialog(page).noResults,
  },
]);
