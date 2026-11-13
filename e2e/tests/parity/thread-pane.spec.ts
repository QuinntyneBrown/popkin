import { directMessageStates } from '../../fixtures/direct-message-states';
import { parity } from '../../fixtures/parity';
import { ConversationsPage } from '../../pages/conversations.page';

/*
 * The Everyone thread beside the Chat list, from 1024 px. The region is the pane's head: its
 * messages carry the reactions, photos and quotes of journeys 12 and 13, and its composer their
 * tools, which this journey does not build.
 */
parity('thread-pane', [
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'everyone',
    region: (page) => new ConversationsPage(page).threadPaneHead,
    widths: [1280],
  },
]);
