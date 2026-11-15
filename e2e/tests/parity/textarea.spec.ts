import { theMockAdmins } from '../../fixtures/admin';
import { AdminActionDialog } from '../../pages/admin/admin-dialogs';
import { AdminsPage } from '../../pages/admin/admins.page';
import { experienceStates } from '../../fixtures/experience-states';
import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { AddCommentDialog } from '../../pages/add-comment.dialog';

const field = (page: Page) => new AddCommentDialog(page).commentField;
// The mock's field has autofocus; the dialog focuses it on open.
const focused = (page: Page) => new AddCommentDialog(page).comment.focus();

parity('textarea', [
  {
    key: 'addComment',
    ...experienceStates.addComment,
    name: 'hint',
    region: field,
    prepare: focused,
  },
  {
    key: 'addCommentInvalid',
    ...experienceStates.addCommentInvalid,
    name: 'invalid',
    region: field,
    prepare: focused,
  },
  {
    key: 'addCommentBusy',
    ...experienceStates.addCommentBusy,
    name: 'busy',
    region: field,
    prepare: focused,
  },
  // Optional: an action's reason for the audit log (L2-087).
  {
    key: 'adminChangeRole',
    name: 'optional',
    region: (page) =>
      new AdminActionDialog(page, 'Make Aiko Tanaka a Viewer?', /Change role/).reasonField,
    before: theMockAdmins,
    app: async (page) => {
      await new AdminsPage(page).role('Aiko Tanaka').selectOption('Viewer');
    },
  },
]);
