import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('popkin-tile', [
  {
    key: 'nameYourPopkinFilled',
    name: 'lg-teal',
    region: (page) => new NameYourPopkinPage(page).preview,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
]);
