import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('system-note', [
  {
    key: 'groupChat',
    name: 'popped-in',
    region: (page) => new GroupChatPage(page).notes.first(),
    before: theMockChat,
  },
]);
