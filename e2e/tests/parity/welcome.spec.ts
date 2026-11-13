import { parity } from '../../fixtures/parity';
import { WelcomePage } from '../../pages/welcome.page';

parity('welcome', [{ key: 'welcome', region: (page) => new WelcomePage(page).welcome }]);
