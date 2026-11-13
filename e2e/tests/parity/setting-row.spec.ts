import { parity } from '../../fixtures/parity';
import { WrapUpPage } from '../../pages/wrap-up.page';

parity('setting-row', [
  { key: 'wrapUp', name: 'kept', region: (page) => new WrapUpPage(page).keepRow },
  // The line under the name says what the choice does as it stands.
  { key: 'wrapUpAlbumOff', name: 'not-kept', region: (page) => new WrapUpPage(page).keepRow },
]);
