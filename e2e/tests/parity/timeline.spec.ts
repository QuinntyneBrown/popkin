import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { HowLongPage } from '../../pages/how-long.page';

// The timeline lives in the split screen's aside, which is not rendered below 768 px. No mock
// draws "Just today"; its bar is the same component at 30 %.
parity('timeline', [
  {
    key: 'howLong',
    name: 'weekend',
    region: (page) => new HowLongPage(page).timeline,
    app: (page) => howLongForLakeside(page),
    widths: [1280],
  },
  {
    key: 'howLongCustom',
    name: 'custom',
    region: (page) => new HowLongPage(page).timeline,
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Until a date').click();
    },
    widths: [1280],
  },
  {
    key: 'howLongForever',
    name: 'forever',
    region: (page) => new HowLongPage(page).timeline,
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Keep it going').click();
    },
    widths: [1280],
  },
]);
