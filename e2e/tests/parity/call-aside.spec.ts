import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

// The pane exists from 1280 px only.
parity('call-aside', [
  {
    key: 'videoCall',
    name: 'six',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
  {
    key: 'videoCallMuted',
    name: 'own-muted',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
  {
    key: 'videoCallTwo',
    name: 'two',
    region: (page) => new VideoCallPage(page).aside,
    widths: [1280],
  },
]);
