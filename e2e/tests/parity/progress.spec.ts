import { parity } from '../../fixtures/parity';
import { addTheThreeSlowly, theMockPhotos } from '../../fixtures/photos';
import { AddPhotosDialog } from '../../pages/add-photos.dialog';
import { RecapPage } from '../../pages/recap.page';

// The mock draws the bar 62 % full, a point the app passes through and no stub can hold; the
// words under it are what both show for the second of three.
parity('progress', [
  {
    key: 'addPhotosBusy',
    name: 'text',
    region: (page) => new AddPhotosDialog(page).progressText,
    before: theMockPhotos,
    app: (page) => addTheThreeSlowly(page, 1),
  },
  // The album being prepared on the recap: a quarter of the way.
  { key: 'recapExporting', name: 'album', region: (page) => new RecapPage(page).progress },
  { key: 'recapExporting', name: 'album-text', region: (page) => new RecapPage(page).progressText },
]);
