import { ConversationsPage } from '../../pages/conversations.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
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
  // On the Chat tab, with the badge that counts what is unread (L2-022 AC1).
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'everyone-unread-count',
    region: (page) => new ConversationsPage(page).everyone,
  },
]);
