import { maraWithPhoto } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

// The card lives in the split screen's aside, which is not rendered below 768 px.
parity('preview-card', [
  {
    key: 'nameYourPopkin',
    name: 'blank',
    region: (page) => new NameYourPopkinPage(page).previewCard,
    before: maraWithPhoto,
    widths: [1280],
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'named',
    region: (page) => new NameYourPopkinPage(page).previewCard,
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
  {
    key: 'nameYourPopkinEdge',
    name: 'long-name',
    region: (page) => new NameYourPopkinPage(page).previewCard,
    before: maraWithPhoto,
    app: async (page) => {
      const step = new NameYourPopkinPage(page);
      await step.chooseLakeside();
      await step.name.fill('The Brennan–Okafor Lakeside Reunion 2026');
    },
    widths: [1280],
  },
]);
