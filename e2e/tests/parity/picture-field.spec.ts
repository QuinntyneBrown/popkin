import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';

parity('picture-field', [
  {
    key: 'shareExperience',
    ...experienceStates.shareExperience,
    name: 'add',
    region: (page) => new ShareExperienceDialog(page).addPicture,
  },
  // The picture the experience has, with "Remove picture" over its corner.
  {
    key: 'shareExperienceEdit',
    ...experienceStates.shareExperienceEdit,
    name: 'chosen',
    region: (page) => new ShareExperienceDialog(page).pictureField,
  },
]);
