import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';
import { VideoCallPage } from '../../pages/video-call.page';

parity('icon-button', [
  { key: 'signUp', name: 'back', region: (page) => new SignUpPage(page).back },
  // Round on a phone; with its word beside the icon from 640 px.
  { key: 'videoCall', name: 'labelled', region: (page) => new VideoCallPage(page).invite },
]);
