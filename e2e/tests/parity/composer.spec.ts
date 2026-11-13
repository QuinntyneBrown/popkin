import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// The mock's field holds Add, Emoji and Photo, which come with later journeys; until then the
// part the two share is "Send".
parity('composer', [
  {
    key: 'groupChat',
    name: 'send',
    region: (page) => new GroupChatPage(page).send,
    before: theMockChat,
  },
]);
