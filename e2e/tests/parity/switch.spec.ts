import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('switch', [
  { key: 'wrapUp', name: 'on', region: (page) => new WrapUpPage(page).keepAlbum },
  { key: 'wrapUpAlbumOff', name: 'off', region: (page) => new WrapUpPage(page).keepAlbum },
  // While the wrap-up is sent the switch cannot be turned.
  { key: 'wrapUpSubmitting', name: 'disabled', region: (page) => new WrapUpPage(page).keepAlbum },
]);
