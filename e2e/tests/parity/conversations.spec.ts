import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { ConversationsPage } from '../../pages/conversations.page';

// The list of conversations as the Chat tab; as the list pane it is in list-pane.spec.ts.
parity('conversations', [
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'list',
    region: (page) => new ConversationsPage(page).list,
  },
  {
    key: 'conversationsEmpty',
    ...directMessageStates.conversationsEmpty,
    name: 'no-direct-messages',
    region: (page) => new ConversationsPage(page).list,
  },
  {
    key: 'conversationsLoading',
    ...directMessageStates.conversationsLoading,
    name: 'loading',
    region: (page) => new ConversationsPage(page).list,
  },
  {
    key: 'conversationsError',
    ...directMessageStates.conversationsError,
    name: 'error',
    region: (page) => new ConversationsPage(page).list,
  },
]);
