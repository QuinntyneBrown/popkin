import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { DirectMessagePage } from '../../pages/direct-message.page';

parity('dm-intro', [
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'thread',
    region: (page) => new DirectMessagePage(page).intro,
  },
  {
    key: 'directMessageEmpty',
    ...directMessageStates.directMessageEmpty,
    name: 'empty',
    region: (page) => new DirectMessagePage(page).intro,
  },
]);
