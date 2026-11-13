import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// On a phone a thread shows no tabs (L2-058 AC8); the sidebar is there from 1024 px.
parity('popkin-nav', [
  {
    key: 'groupChat',
    name: 'sidebar',
    region: (page) => new GroupChatPage(page).nav,
    before: theMockChat,
    widths: [1280],
  },
]);
