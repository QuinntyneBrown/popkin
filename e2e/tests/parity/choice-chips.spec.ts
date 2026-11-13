import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';

parity('choice-chips', [
  {
    key: 'shareExperience',
    ...experienceStates.shareExperience,
    name: 'kind',
    region: (page) => new ShareExperienceDialog(page).kindField,
  },
]);
