import { theChatUnread } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// The list of conversations sits beside the thread from 1024 px.
parity('conversation-card', [
  {
    key: 'groupChat',
    name: 'everyone',
    region: (page) => new GroupChatPage(page).everyoneCard,
    before: theChatUnread,
    widths: [1280],
  },
]);
