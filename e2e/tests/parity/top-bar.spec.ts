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
]);
