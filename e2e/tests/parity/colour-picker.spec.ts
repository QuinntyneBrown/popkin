import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('colour-picker', [
  { key: 'nameYourPopkin', name: 'coral', region: (page) => new NameYourPopkinPage(page).swatches },
  {
    key: 'nameYourPopkinFilled',
    name: 'teal',
    region: (page) => new NameYourPopkinPage(page).swatches,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
]);
