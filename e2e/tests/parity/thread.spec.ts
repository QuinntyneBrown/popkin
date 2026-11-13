import { aMessageArrivesBelow, theChatWithManyMessages } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('thread', [
  {
    key: 'groupChatNewMessages',
    name: 'new-messages',
    region: (page) => new GroupChatPage(page).newMessages,
    before: theChatWithManyMessages,
    app: aMessageArrivesBelow,
    snap: true,
  },
]);
