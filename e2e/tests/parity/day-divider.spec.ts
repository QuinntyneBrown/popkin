import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('day-divider', [
  {
    key: 'groupChat',
    name: 'today',
    region: (page) => new GroupChatPage(page).dayDividers.first(),
    before: theMockChat,
  },
]);
