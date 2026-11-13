import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

// The stage as a whole, where it shows no camera: joining, and the call that could not start.
parity('call-screen', [
  { key: 'videoCallLoading', name: 'joining', region: (page) => new VideoCallPage(page).root },
  { key: 'videoCallError', name: 'refused', region: (page) => new VideoCallPage(page).root },
]);
