import { parity } from '../../fixtures/parity';
import { theThisWeekLoading, theTimeOffLoading } from '../../fixtures/schedule';
import { ThisWeekPage } from '../../pages/this-week.page';
import { TimeOffPage } from '../../pages/time-off.page';

// What the Schedule tab's body draws of its own: the skeleton of each view while it loads. The
// views inside it have their own specs.
parity('schedule', [
  {
    key: 'timeOffLoading',
    name: 'time-off-loading',
    region: (page) => new TimeOffPage(page).skeleton,
    before: theTimeOffLoading,
    snap: true,
  },
  {
    key: 'thisWeekLoading',
    name: 'this-week-loading',
    region: (page) => new ThisWeekPage(page).skeleton,
    before: theThisWeekLoading,
    snap: true,
  },
]);
