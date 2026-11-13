import { theMockHome } from '../../fixtures/home';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { theChatUnread } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

// The Popkin's tabs are a sidebar from 1024 px; on a phone a thread shows none (L2-058 AC8).
parity('badge', [
  {
    key: 'groupChatUnread',
    name: 'unread',
    region: (page) => new GroupChatPage(page).navBadge,
    before: theChatUnread,
    widths: [1280],
  },
  {
    key: 'popkinHome',
    name: 'words',
    region: (page) => new PopkinHomePage(page).newCount,
    before: theMockHome,
  },
]);
