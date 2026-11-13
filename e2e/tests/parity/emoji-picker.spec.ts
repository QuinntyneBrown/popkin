import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('emoji-picker', [
  {
    key: 'nameYourPopkinFilled',
    name: 'camping-teal',
    region: (page) => new NameYourPopkinPage(page).emojiGrid,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
]);
