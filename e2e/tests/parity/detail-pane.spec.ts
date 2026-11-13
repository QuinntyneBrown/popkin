import { DirectMessagePage } from '../../pages/direct-message.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// Who is here now is a third pane from 1280 px.
parity('detail-pane', [
  {
    key: 'groupChat',
    name: 'here-now',
    region: (page) => new GroupChatPage(page).detailPane,
    before: theMockChat,
    widths: [1280],
  },
  // The other member of a direct message. Its shared photos are journey 13: the regions are its parts.
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'person-name',
    region: (page) => new DirectMessagePage(page).personName,
    widths: [1280],
  },
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'person-place',
    region: (page) => new DirectMessagePage(page).personPlace,
    widths: [1280],
  },
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'person-call',
    region: (page) => new DirectMessagePage(page).personCall,
    widths: [1280],
  },
]);
