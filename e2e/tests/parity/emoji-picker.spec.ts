import { settingsStates } from '../../fixtures/settings-states';
import { EditPopkinDialog } from '../../pages/edit-popkin.dialog';
import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('emoji-picker', [
  {
    key: 'nameYourPopkinFilled',
    name: 'camping-teal',
    region: (page) => new NameYourPopkinPage(page).emojiGrid,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
  // In a dialog, with a field label: "Edit name and look" (journey 16).
  {
    key: 'editPopkin',
    ...settingsStates.editPopkin,
    name: 'field',
    region: (page) => new EditPopkinDialog(page).emoji.locator('..'),
  },
]);
