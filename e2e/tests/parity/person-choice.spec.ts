import { parity } from '../../fixtures/parity';
import { ConnectPersonDialog } from '../../pages/connect-person.dialog';
import { chooseChidi, connectChidiToAda, connectionsAsDrawn } from './connection-steps';

const who = (page: import('@playwright/test').Page) => new ConnectPersonDialog(page).who;

parity('person-choice', [
  // Connect's "Who" with Ada chosen.
  {
    key: 'connectPerson',
    name: 'chosen',
    region: who,
    before: connectionsAsDrawn,
    app: async (page) => void (await connectChidiToAda(page)),
    snap: true,
  },
  // Nobody chosen and Connect pressed: refused, its edge unchanged; the error is the field's own.
  {
    key: 'connectPersonInvalid',
    name: 'invalid',
    region: who,
    before: connectionsAsDrawn,
    app: async (page) => {
      const connections = await chooseChidi(page);
      await connections.connect.click();
      await new ConnectPersonDialog(page).submit.click();
    },
    snap: true,
  },
]);
