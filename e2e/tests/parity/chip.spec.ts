import { theChatEmpty } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('chip', [
  {
    key: 'groupChatEmpty',
    name: 'opener',
    region: (page) => new GroupChatPage(page).openers.first(),
    before: theChatEmpty,
  },
]);
