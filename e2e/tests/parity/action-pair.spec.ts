import { parity } from '../../fixtures/parity';
import { WelcomePage } from '../../pages/welcome.page';

// Stacked on a phone, side by side from 1280 px.
parity('action-pair', [{ key: 'welcome', region: (page) => new WelcomePage(page).actions }]);
