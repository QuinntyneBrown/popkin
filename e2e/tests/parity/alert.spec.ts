import { addTheThreeWithOneFailing, theMockPhotos } from '../../fixtures/photos';
import { AddPhotosDialog } from '../../pages/add-photos.dialog';
import { theHomeWithoutPhotos } from '../../fixtures/home';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { HowLongPage } from '../../pages/how-long.page';
import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { answer, problem } from '../../fixtures/stubs';
import { SignUpPage } from '../../pages/sign-up.page';

parity('alert', [
  {
    key: 'signUpError',
    name: 'danger',
    region: (page) => new SignUpPage(page).alert,
    app: async (page) => {
      await answer(page, 'POST /api/auth/codes', problem(503, 'code_not_sent'));
      const signUp = new SignUpPage(page);
      await signUp.fill('Mara', '(415) 555-0148');
      await signUp.submit();
      await signUp.alert.waitFor();
    },
  },
  {
    key: 'howLongError',
    name: 'danger-popkin',
    region: (page) => new HowLongPage(page).alert,
    app: async (page) => {
      await answer(page, 'POST /api/popkins', problem(500, 'unexpected'));
      await howLongForLakeside(page);
      const step = new HowLongPage(page);
      await step.popItUp.click();
      await step.alert.waitFor();
    },
  },
  {
    key: 'popkinHomePartial',
    name: 'with-action',
    region: (page) => new PopkinHomePage(page).photosFailure,
    before: theHomeWithoutPhotos,
  },
  {
    key: 'addPhotosFailed',
    name: 'upload-outcome',
    region: (page) => new AddPhotosDialog(page).outcome,
    before: theMockPhotos,
    app: addTheThreeWithOneFailing,
  },
]);
