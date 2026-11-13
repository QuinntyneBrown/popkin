import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

type Page = import('@playwright/test').Page;

// The mock draws photographs where the app plays what the cameras see, so the tiles are
// compared without their pictures: the page object takes them out of the mock and the app alike.
const withoutPictures = (page: Page) => new VideoCallPage(page).withoutPictures();

parity('call-tile', [
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'camera-off',
    region: (page: Page) => new VideoCallPage(page).tile('Ruth'),
  },
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'muted',
    region: (page: Page) => new VideoCallPage(page).tile('Sam'),
  },
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'speaking',
    region: (page: Page) => new VideoCallPage(page).speaking,
    prepare: withoutPictures,
  },
  {
    key: 'videoCallCameraOff',
    ...callStates.videoCallCameraOff,
    name: 'own-camera-off',
    region: (page: Page) => new VideoCallPage(page).tile('You'),
  },
  {
    key: 'videoCallMuted',
    ...callStates.videoCallMuted,
    name: 'own-muted',
    region: (page: Page) => new VideoCallPage(page).tile('You'),
    prepare: withoutPictures,
  },
]);
