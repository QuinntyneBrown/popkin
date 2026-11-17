import { parity } from '../../fixtures/parity';
import { GroupAddPeopleDialog } from '../../pages/group-add-people.dialog';
import { addDevAndGrace, addPeopleAsDrawn } from './group-steps';

parity('tick-list', [
  // The four in the group ticked and locked, then Ben, Dev and Grace with Dev and Grace ticked, and Priya.
  {
    key: 'groupAddPeople',
    name: 'ticked',
    region: (page) => new GroupAddPeopleDialog(page).list,
    before: addPeopleAsDrawn,
    app: async (page) => void (await addDevAndGrace(page)),
    snap: true,
  },
]);
