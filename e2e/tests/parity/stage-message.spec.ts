import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

parity('stage-message', [
  {
    key: 'videoCallLoading',
    ...callStates.videoCallLoading,
    name: 'joining',
    region: (page) => new VideoCallPage(page).message,
  },
  {
    key: 'videoCallError',
    ...callStates.videoCallError,
    name: 'refused',
    region: (page) => new VideoCallPage(page).message,
  },
  {
    key: 'videoCallEmpty',
    ...callStates.videoCallEmpty,
    name: 'waiting',
    region: (page) => new VideoCallPage(page).message,
  },
]);
