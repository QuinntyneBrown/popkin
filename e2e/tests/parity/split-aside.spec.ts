import { parity } from '../../fixtures/parity';
import { howLongForLakeside, maraWithPhoto } from '../../fixtures/journeys';
import { HowLongPage } from '../../pages/how-long.page';
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
  {
    key: 'howLongForever',
    name: 'tint-icon',
    region: (page) => new HowLongPage(page).picture,
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Keep it going').click();
    },
    widths: [1280],
  },
]);
