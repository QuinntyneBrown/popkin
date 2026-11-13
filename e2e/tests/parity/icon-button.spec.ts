import { ExperienceDetailPage } from '../../pages/experience-detail.page';
import { callStates } from '../../fixtures/call-states';
import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';
import { VideoCallPage } from '../../pages/video-call.page';

parity('icon-button', [
  { key: 'signUp', name: 'back', region: (page) => new SignUpPage(page).back },
  // Round on a phone; with its word beside the icon from 640 px.
  {
    key: 'videoCall',
    ...callStates.videoCall,
    name: 'labelled',
    region: (page) => new VideoCallPage(page).invite,
  },
  // On a picture: a white disc with a shadow.
  {
    key: 'experienceDetail',
    name: 'on-picture',
    region: (page) => new ExperienceDetailPage(page).back,
  },
]);
