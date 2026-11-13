import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

parity('stage-message', [
  { key: 'videoCallLoading', name: 'joining', region: (page) => new VideoCallPage(page).message },
  { key: 'videoCallError', name: 'refused', region: (page) => new VideoCallPage(page).message },
  { key: 'videoCallEmpty', name: 'waiting', region: (page) => new VideoCallPage(page).message },
]);
