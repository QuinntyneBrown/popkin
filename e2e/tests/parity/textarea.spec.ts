import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { AddCommentDialog } from '../../pages/add-comment.dialog';

const field = (page: Page) => new AddCommentDialog(page).commentField;
// The mock's field has autofocus; the dialog focuses it on open.
const focused = (page: Page) => new AddCommentDialog(page).comment.focus();

parity('textarea', [
  { key: 'addComment', name: 'hint', region: field, prepare: focused },
  { key: 'addCommentInvalid', name: 'invalid', region: field, prepare: focused },
  { key: 'addCommentBusy', name: 'busy', region: field, prepare: focused },
]);
