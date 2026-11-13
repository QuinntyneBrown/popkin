import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { ConversationsPage } from '../../pages/conversations.page';
import { DirectMessagePage } from '../../pages/direct-message.page';

parity('conversation-row', [
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'unread',
    region: (page) => new ConversationsPage(page).row('Walt Brennan').root,
  },
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'yours-latest',
    region: (page) => new ConversationsPage(page).row('Ellie Brennan').root,
  },
  // The open conversation in the list pane, from 1024 px.
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'open',
    region: (page) => new DirectMessagePage(page).currentRow,
    widths: [1280],
  },
]);
