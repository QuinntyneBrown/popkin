import { parity } from '../../fixtures/parity';
import { WelcomePage } from '../../pages/welcome.page';

// One picture at each width: in the column on a phone, in the aside from 768 px.
parity('mark-picture', [
  {
    key: 'welcome',
    name: 'column',
    region: (page) => new WelcomePage(page).picture,
    widths: [360],
  },
  {
    key: 'welcome',
    name: 'aside',
    region: (page) => new WelcomePage(page).asidePicture,
    widths: [1280],
  },
]);
