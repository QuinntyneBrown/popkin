import { settingsStates } from '../../fixtures/settings-states';
import { EditPopkinDialog } from '../../pages/edit-popkin.dialog';
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
  // In a dialog, with a field label: "Edit name and look" (journey 16).
  {
    key: 'editPopkin',
    ...settingsStates.editPopkin,
    name: 'field',
    region: (page) => new EditPopkinDialog(page).colours.locator('..'),
  },
]);
