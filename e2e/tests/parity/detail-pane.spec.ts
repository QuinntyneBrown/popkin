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
]);
