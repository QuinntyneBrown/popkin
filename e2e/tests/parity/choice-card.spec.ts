import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { settingsStates } from '../../fixtures/settings-states';
import { ChangeLengthDialog } from '../../pages/change-length.dialog';
import { HowLongPage } from '../../pages/how-long.page';

parity('choice-card', [
  {
    key: 'howLong',
    name: 'checked',
    region: (page) => new HowLongPage(page).checkedCard,
    app: howLongForLakeside,
  },
  {
    key: 'howLong',
    name: 'unchecked',
    region: (page) => new HowLongPage(page).firstCard,
    app: howLongForLakeside,
  },
  // In a dialog: "Change how long it lasts" (journey 16).
  {
    key: 'changeLength',
    ...settingsStates.changeLength,
    name: 'dialog',
    region: (page) => new ChangeLengthDialog(page).group,
  },
]);
