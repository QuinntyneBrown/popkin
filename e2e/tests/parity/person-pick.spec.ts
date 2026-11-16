import { parity } from '../../fixtures/parity';
import { NewHabitDialog } from '../../pages/new-habit.dialog';
import { chidiWithoutHabit, openNewHabit } from './habit-steps';

parity('person-pick', [
  // New habit's "With": the person and Change.
  {
    key: 'newHabit',
    name: 'change',
    region: (page) => new NewHabitDialog(page).withPerson,
    before: chidiWithoutHabit,
    app: async (page) => void (await openNewHabit(page)),
    snap: true,
  },
]);
