import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

parity('call-controls', [
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'on',
    region: (page) => new VideoCallPage(page).controls,
  },
  {
    key: 'videoCallMuted',
    ...callStates.videoCallMuted,
    name: 'muted',
    region: (page) => new VideoCallPage(page).controls,
  },
  {
    key: 'videoCallCameraOff',
    ...callStates.videoCallCameraOff,
    name: 'camera-off',
    region: (page) => new VideoCallPage(page).controls,
  },
  // Before anyone else is on the call the controls keep the spacing of a phone at every width.
  {
    key: 'videoCallLoading',
    ...callStates.videoCallLoading,
    name: 'joining',
    region: (page) => new VideoCallPage(page).controls,
  },
]);
