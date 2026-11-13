import { DirectMessagePage } from '../../pages/direct-message.page';
import { ConversationsPage } from '../../pages/conversations.page';
import { directMessageStates } from '../../fixtures/direct-message-states';
import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';
import { SignInPage } from '../../pages/sign-in.page';
import { theMockChat } from '../../fixtures/chat';
import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';
import { NotFoundPage } from '../../pages/not-found.page';
import { SignUpPage } from '../../pages/sign-up.page';
import { VideoCallPage } from '../../pages/video-call.page';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('top-bar', [
  { key: 'notFound', name: 'brand', region: (page) => new NotFoundPage(page).topBar },
  { key: 'signUp', name: 'steps', region: (page) => new SignUpPage(page).topBar },
  {
    key: 'groupChat',
    name: 'thread-titles',
    region: (page) => new GroupChatPage(page).titles,
    before: theMockChat,
  },
  { key: 'signIn', name: 'back-only', region: (page) => new SignInPage(page).topBar },
  // On the stage: Minimise, the emoji in the title, and the taller bar of a call from 640 px.
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'call',
    region: (page) => new VideoCallPage(page).topBar,
  },
  {
    key: 'videoCallLoading',
    ...callStates.videoCallLoading,
    name: 'joining',
    region: (page) => new VideoCallPage(page).topBar,
  },
  {
    key: 'experienceDetailError',
    ...experienceStates.experienceDetailError,
    name: 'experience-error',
    region: (page) => new ExperienceDetailPage(page).bar,
  },
  // A wrapped-up Popkin's thread: the tile greyed, and when it wrapped up.
  {
    key: 'groupChatReadOnly',
    ...wrapUpStates.groupChatReadOnly,
    name: 'read-only',
    region: (page) => new GroupChatPage(page).topBar,
  },
  {
    key: 'wrapUp',
    ...wrapUpStates.wrapUp,
    name: 'wrap-up',
    region: (page) => new WrapUpPage(page).topBar,
  },
  // A call between two: the other member's name in the title, "Just the two of you".
  {
    key: 'videoCallTwo',
    ...callStates.videoCallTwo,
    name: 'call-two',
    region: (page) => new VideoCallPage(page).topBar,
  },
  // Journey 11: the Chat tab's bar, the head of the thread pane, a direct message's bar.
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'list-tab',
    region: (page) => new ConversationsPage(page).topBar,
  },
  {
    key: 'conversations',
    ...directMessageStates.conversations,
    name: 'thread-pane-head',
    region: (page) => new ConversationsPage(page).threadPaneHead,
    widths: [1280],
  },
  {
    key: 'directMessage',
    ...directMessageStates.directMessage,
    name: 'direct-message',
    region: (page) => new DirectMessagePage(page).topBar,
  },
  {
    key: 'directMessageReadOnly',
    ...directMessageStates.directMessageReadOnly,
    name: 'direct-message-read-only',
    region: (page) => new DirectMessagePage(page).topBar,
  },
]);
