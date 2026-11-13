import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { HowLongPage } from '../../pages/how-long.page';

parity('date-button', [
  {
    key: 'howLongCustom',
    region: (page) => new HowLongPage(page).dateButton,
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Until a date').click();
    },
  },
  // With another icon and other words: "Add a picture".
  {
    key: 'shareExperience',
    name: 'picture',
    region: (page) => new ShareExperienceDialog(page).addPicture,
  },
]);
