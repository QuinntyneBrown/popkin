import { parity } from '../../fixtures/parity';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('name-preview', [
  {
    key: 'nameYourPopkin',
    name: 'blank',
    region: (page) => new NameYourPopkinPage(page).previewRow,
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'named',
    region: (page) => new NameYourPopkinPage(page).previewRow,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
  {
    key: 'nameYourPopkinEdge',
    name: 'count',
    region: (page) => new NameYourPopkinPage(page).count,
    app: async (page) => {
      const step = new NameYourPopkinPage(page);
      await step.chooseLakeside();
      await step.name.fill('The Brennan–Okafor Lakeside Reunion 2026');
    },
  },
]);
