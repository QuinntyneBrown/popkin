import { parity } from '../../fixtures/parity';
import { addTheThreeSlowly, theMockPhotos } from '../../fixtures/photos';
import { AddPhotosDialog } from '../../pages/add-photos.dialog';

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
]);
