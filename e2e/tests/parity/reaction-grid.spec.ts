import { parity } from '../../fixtures/parity';
import { reactStates } from '../../fixtures/react-states';
import { ReactionsDialog } from '../../pages/reactions.dialog';

parity('reaction-grid', [
  // The five quick reactions, Heart pressed: the member reacted with it (L2-024 AC1).
  {
    key: 'reactions',
    ...reactStates.reactions,
    name: 'quick',
    region: (page) => new ReactionsDialog(page).quickGrid,
  },
  // On the member's own message, none pressed.
  {
    key: 'reactionsMine',
    ...reactStates.reactionsMine,
    name: 'quick-none',
    region: (page) => new ReactionsDialog(page).quickGrid,
  },
  // The twelve behind "More reactions".
  {
    key: 'reactionsMore',
    ...reactStates.reactionsMore,
    name: 'more',
    region: (page) => new ReactionsDialog(page).moreGrid,
  },
]);
