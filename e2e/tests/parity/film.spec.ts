import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

parity('film', [
  { key: 'marketingHome', region: (page) => new MarketingHomePage(page).film },
]);
