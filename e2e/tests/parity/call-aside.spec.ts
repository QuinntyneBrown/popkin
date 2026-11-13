import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

// The pane exists from 1280 px only.
parity('call-aside', [
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'six',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
  {
    key: 'videoCallMuted',
    ...callStates.videoCallMuted,
    name: 'own-muted',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
  {
    key: 'videoCallTwo',
    ...callStates.videoCallTwo,
    name: 'two',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
]);
