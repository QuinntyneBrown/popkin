import { parity } from '../../fixtures/parity';
import { maraWithPhoto } from '../../fixtures/journeys';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';
import { SignUpPage } from '../../pages/sign-up.page';

// The aside is not rendered below 768 px, so there is nothing to compare at 360 px.
parity('split-aside', [
  {
    key: 'signUp',
    name: 'photo',
    region: (page) => new SignUpPage(page).picture,
    widths: [1280],
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'tint-centred',
    region: (page) => new NameYourPopkinPage(page).picture,
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
]);
