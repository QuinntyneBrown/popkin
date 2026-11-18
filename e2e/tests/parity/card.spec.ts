import { theHomeEmpty } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { ContactAddedPage } from '../../pages/contact-added.page';

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
  {
    key: 'contactAdded',
    name: 'row',
    region: (page) => new ContactAddedPage(page).addMore,
  },
]);
