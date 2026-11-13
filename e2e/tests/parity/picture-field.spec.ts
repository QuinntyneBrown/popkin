import { parity } from '../../fixtures/parity';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';

// The mocks draw the field before a picture is chosen; the chosen picture has no mock.
parity('picture-field', [
  {
    key: 'shareExperience',
    name: 'add',
    region: (page) => new ShareExperienceDialog(page).addPicture,
  },
]);
