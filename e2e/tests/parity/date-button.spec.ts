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
]);
