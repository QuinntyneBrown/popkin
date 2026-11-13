import { parity } from '../../fixtures/parity';
import {
  addTheThreeSlowly,
  addTheThreeWithOneFailing,
  chooseOneTooLarge,
  chooseTheThree,
  theMockPhotos,
} from '../../fixtures/photos';
import { AddPhotosDialog } from '../../pages/add-photos.dialog';

const row = (n: number) => (page: import('@playwright/test').Page) =>
  new AddPhotosDialog(page).row(n);

parity('upload-item', [
  {
    key: 'addPhotos',
    name: 'captioned',
    region: row(1),
    before: theMockPhotos,
    app: chooseTheThree,
  },
  { key: 'addPhotos', name: 'blank', region: row(2), before: theMockPhotos, app: chooseTheThree },
  {
    key: 'addPhotosInvalid',
    name: 'invalid',
    region: row(3),
    before: theMockPhotos,
    app: chooseOneTooLarge,
  },
  {
    key: 'addPhotosBusy',
    name: 'uploading',
    region: row(2),
    before: theMockPhotos,
    app: (page) => addTheThreeSlowly(page),
  },
  {
    key: 'addPhotosFailed',
    name: 'failed',
    region: row(3),
    before: theMockPhotos,
    app: addTheThreeWithOneFailing,
  },
]);
