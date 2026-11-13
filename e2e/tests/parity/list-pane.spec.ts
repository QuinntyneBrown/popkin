import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { DirectMessagePage } from '../../pages/direct-message.page';

// The list of conversations beside a direct message, from 1024 px.
parity('list-pane', [
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'direct-message',
    region: (page) => new DirectMessagePage(page).listPane,
    widths: [1280],
  },
]);
