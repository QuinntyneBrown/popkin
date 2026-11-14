import { parity } from '../../fixtures/parity';
import { LegalDocumentPage } from '../../pages/legal-document.page';

parity('prose', [
  { key: 'privacy', region: (page) => new LegalDocumentPage(page, 'privacy').prose },
  { key: 'terms', region: (page) => new LegalDocumentPage(page, 'terms').prose },
]);
