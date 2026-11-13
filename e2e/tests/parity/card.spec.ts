import { theHomeEmpty } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('card', [
  {
    key: 'popkinHomeEmpty',
    name: 'centred',
    region: (page) => new PopkinHomePage(page).photosCard,
    before: theHomeEmpty,
  },
  {
    key: 'popkinHomeEmpty',
    name: 'plain',
    region: (page) => new PopkinHomePage(page).chat,
    before: theHomeEmpty,
  },
]);
