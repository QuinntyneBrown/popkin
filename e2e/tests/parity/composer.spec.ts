import { DirectMessagePage } from '../../pages/direct-message.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { theMockChat } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';
import { MessageActions } from '../../pages/message-actions';
import { reactStates } from '../../fixtures/react-states';

// The mock's field holds Add, Emoji and Photo, which come with later journeys; until then the
// part the two share is "Send".
parity('composer', [
  {
    key: 'groupChat',
    name: 'send',
    region: (page) => new GroupChatPage(page).send,
    before: theMockChat,
  },
  // The Popkin has wrapped up: the line that says so, in place of the field.
  {
    key: 'groupChatReadOnly',
    ...wrapUpStates.groupChatReadOnly,
    name: 'closed',
    region: (page) => new GroupChatPage(page).composer,
  },
  {
    key: 'directMessageReadOnly',
    ...directMessageStates.directMessageReadOnly,
    name: 'direct-closed',
    region: (page) => new DirectMessagePage(page).composer,
  },
  // Journey 12: "Replying to Ruth" over one line of her message, and Cancel reply (L2-025 AC1).
  {
    key: 'groupChat',
    ...reactStates.groupChatReplying,
    name: 'reply',
    region: (page) => new MessageActions(page).replyBar,
  },
]);
