import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('switch', [
  {
    key: 'wrapUp',
    ...wrapUpStates.wrapUp,
    name: 'on',
    region: (page) => new WrapUpPage(page).keepAlbum,
  },
  {
    key: 'wrapUpAlbumOff',
    ...wrapUpStates.wrapUpAlbumOff,
    name: 'off',
    region: (page) => new WrapUpPage(page).keepAlbum,
  },
  // While the wrap-up is sent the switch cannot be turned.
  {
    key: 'wrapUpSubmitting',
    ...wrapUpStates.wrapUpSubmitting,
    name: 'disabled',
    region: (page) => new WrapUpPage(page).keepAlbum,
  },
]);
