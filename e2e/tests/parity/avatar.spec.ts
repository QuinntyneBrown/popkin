import { maraWithPhoto } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

// Journey 1 shows one avatar: the Host's, on the preview card, from 768 px.
parity('avatar', [
  {
    key: 'nameYourPopkinFilled',
    name: 'photo-xs',
    region: (page) => new NameYourPopkinPage(page).previewAvatar,
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
]);
