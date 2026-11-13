import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

// Journey 1 shows it on the preview card, from 768 px.
parity('time-left', [
  {
    key: 'nameYourPopkin',
    name: 'coral',
    region: (page) => new NameYourPopkinPage(page).previewTimeLeft,
    widths: [1280],
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'teal',
    region: (page) => new NameYourPopkinPage(page).previewTimeLeft,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
]);
