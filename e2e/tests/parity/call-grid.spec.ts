import { parity } from '../../fixtures/parity';
import { VideoCallPage } from '../../pages/video-call.page';

type Page = import('@playwright/test').Page;

// The mock draws photographs where the app plays what the cameras see, so the tiles are
// compared without their pictures: the page object takes them out of the mock and the app alike.
const withoutPictures = (page: Page) => new VideoCallPage(page).withoutPictures();

parity('call-grid', [
  {
    key: 'videoCall',
    name: 'six',
    region: (page: Page) => new VideoCallPage(page).grid,
    prepare: withoutPictures,
  },
  {
    key: 'videoCallTwo',
    name: 'two',
    region: (page: Page) => new VideoCallPage(page).grid,
    prepare: withoutPictures,
  },
  {
    key: 'videoCallEmpty',
    name: 'alone',
    region: (page: Page) => new VideoCallPage(page).grid,
    prepare: withoutPictures,
  },
]);
