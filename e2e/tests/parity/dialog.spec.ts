import { settingsStates } from '../../fixtures/settings-states';
import { EditPopkinDialog } from '../../pages/edit-popkin.dialog';
import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { AddCommentDialog } from '../../pages/add-comment.dialog';
import { DeleteExperienceDialog } from '../../pages/delete-experience.dialog';
import { LeavePopkinDialog } from '../../pages/leave-popkin.dialog';
import { leaveStates } from '../../fixtures/leave-states';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { openTheScanner, withACamera } from '../../fixtures/my-popkins';
import { ScanToJoinDialog } from '../../pages/scan-to-join.dialog';
import { copyTheInvite, openTheInvite, theMockHome } from '../../fixtures/home';
import { InviteDialog } from '../../pages/invite.dialog';
import type { Page } from '@playwright/test';
import { howLongForLakeside } from '../../fixtures/journeys';
import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { DeleteAccountDialog } from '../../pages/delete-account.dialog';
import { SignOutDialog } from '../../pages/sign-out.dialog';
import { EndDateDialog } from '../../pages/end-date.dialog';
import { HowLongPage } from '../../pages/how-long.page';
import { PopkinSettingsDialog } from '../../pages/popkin-settings.dialog';
import { DeleteMessageDialog } from '../../pages/delete-message.dialog';
import { ReactionsDialog } from '../../pages/reactions.dialog';
import { reactStates } from '../../fixtures/react-states';

const openEndDate = async (page: Page, today?: Date) => {
  await howLongForLakeside(page, today);
  const step = new HowLongPage(page);
  await step.option('Until a date').click();
  await step.endDate.click();
  await new EndDateDialog(page).panel.waitFor();
};

const stayInFocus = async (page: Page) => {
  await page.keyboard.press('Shift');
  await new LeavePopkinDialog(page).stay.focus();
};
const keepInFocus = async (page: Page) => {
  // A key first, so the browser draws the ring it draws for the keyboard, as the mock has.
  await page.keyboard.press('Shift');
  await new DeleteExperienceDialog(page).keep.focus();
};

parity('dialog', [
  {
    key: 'endDate',
    name: 'sheet',
    region: (page) => new EndDateDialog(page).panel,
    app: openEndDate,
    // The mock's Day field has autofocus; the dialog focuses it on open.
    prepare: (page) => new EndDateDialog(page).day.focus(),
  },
  {
    key: 'endDateInvalid',
    name: 'invalid',
    region: (page) => new EndDateDialog(page).panel,
    app: async (page) => {
      // The invalid mock refuses 9 am on 12 November, less than an hour ahead.
      await openEndDate(page, new Date(2026, 10, 12, 8, 30));
      const dialog = new EndDateDialog(page);
      await dialog.day.fill('2026-11-12');
      await dialog.time.fill('09:00');
      await dialog.setTheEnd.click();
      await dialog.error.waitFor();
    },
    prepare: (page) => new EndDateDialog(page).day.focus(),
  },
  {
    key: 'inviteDialog',
    name: 'invite-header',
    region: (page) => new InviteDialog(page).header,
    before: theMockHome,
    app: openTheInvite,
  },
  {
    key: 'inviteDialogCopied',
    name: 'invite-copied',
    region: (page) => new InviteDialog(page).footer,
    before: theMockHome,
    app: copyTheInvite,
  },
  {
    key: 'scanToJoin',
    name: 'scan-header',
    region: (page) => new ScanToJoinDialog(page).header,
    before: withACamera('asking'),
    app: openTheScanner,
  },
  {
    key: 'scanToJoinDenied',
    name: 'scan-denied-footer',
    region: (page) => new ScanToJoinDialog(page).footer,
    before: withACamera('denied'),
    app: openTheScanner,
    // The mock's first action has autofocus; the app moves the focus to it.
    prepare: async (page) => {
      // A key first, so the browser draws the ring it draws for the keyboard, as the mock has.
      await page.keyboard.press('Shift');
      await new ScanToJoinDialog(page).typeTheCode.focus();
    },
  },
  {
    key: 'shareExperience',
    ...experienceStates.shareExperience,
    name: 'share-experience',
    region: (page) => new ShareExperienceDialog(page).panel,
    // The mock's Title has autofocus; the dialog focuses it on open.
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
  {
    key: 'shareExperienceBusy',
    ...experienceStates.shareExperienceBusy,
    name: 'share-experience-busy',
    region: (page) => new ShareExperienceDialog(page).panel,
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
  {
    key: 'shareExperienceInvalid',
    ...experienceStates.shareExperienceInvalid,
    name: 'share-experience-invalid',
    region: (page) => new ShareExperienceDialog(page).panel,
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
  {
    key: 'shareExperienceFailed',
    ...experienceStates.shareExperienceFailed,
    name: 'share-experience-failed',
    region: (page) => new ShareExperienceDialog(page).panel,
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
  {
    key: 'shareExperienceEdit',
    ...experienceStates.shareExperienceEdit,
    name: 'share-experience-edit',
    region: (page) => new ShareExperienceDialog(page).panel,
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
  {
    key: 'experienceActions',
    ...experienceStates.experienceActions,
    name: 'experience-actions',
    region: (page) => new ExperienceActionsDialog(page).panel,
  },
  {
    key: 'deleteExperience',
    ...experienceStates.deleteExperience,
    name: 'delete-experience',
    region: (page) => new DeleteExperienceDialog(page).panel,
    // The mock's "Keep it" has autofocus; the dialog focuses it on open.
    prepare: (page) => keepInFocus(page),
  },
  {
    key: 'deleteExperienceBusy',
    ...experienceStates.deleteExperienceBusy,
    name: 'delete-experience-busy',
    region: (page) => new DeleteExperienceDialog(page).panel,
    prepare: (page) => keepInFocus(page),
  },
  {
    key: 'deleteExperienceFailed',
    ...experienceStates.deleteExperienceFailed,
    name: 'delete-experience-failed',
    region: (page) => new DeleteExperienceDialog(page).panel,
    prepare: (page) => keepInFocus(page),
  },
  {
    key: 'leavePopkin',
    ...leaveStates.leavePopkin,
    name: 'leave-popkin',
    region: (page) => new LeavePopkinDialog(page).panel,
    // The mock's "Stay" has autofocus; the dialog focuses it on open.
    prepare: (page) => stayInFocus(page),
  },
  {
    key: 'leavePopkinBusy',
    ...leaveStates.leavePopkinBusy,
    name: 'leave-popkin-busy',
    region: (page) => new LeavePopkinDialog(page).panel,
    prepare: (page) => stayInFocus(page),
  },
  {
    key: 'leavePopkinFailed',
    ...leaveStates.leavePopkinFailed,
    name: 'leave-popkin-failed',
    region: (page) => new LeavePopkinDialog(page).panel,
    prepare: (page) => stayInFocus(page),
  },
  {
    key: 'addComment',
    ...experienceStates.addComment,
    name: 'add-comment',
    region: (page) => new AddCommentDialog(page).panel,
    // The mock's field has autofocus; the dialog focuses it on open.
    prepare: (page) => new AddCommentDialog(page).comment.focus(),
  },
  {
    key: 'addCommentBusy',
    ...experienceStates.addCommentBusy,
    name: 'add-comment-busy',
    region: (page) => new AddCommentDialog(page).panel,
    prepare: (page) => new AddCommentDialog(page).comment.focus(),
  },
  {
    key: 'addCommentInvalid',
    ...experienceStates.addCommentInvalid,
    name: 'add-comment-invalid',
    region: (page) => new AddCommentDialog(page).panel,
    prepare: (page) => new AddCommentDialog(page).comment.focus(),
  },
  {
    key: 'popkinSettings',
    ...wrapUpStates.popkinSettings,
    name: 'popkin-settings',
    region: (page) => new PopkinSettingsDialog(page).panel,
  },
  // Edit name and look (journey 16): the focus starts in the name, as the mock's autofocus.
  ...(['editPopkin', 'editPopkinBusy', 'editPopkinInvalid', 'editPopkinFailed'] as const).map(
    (key) => ({
      key,
      ...settingsStates[key],
      name: key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
      region: (page: Page) => new EditPopkinDialog(page).panel,
      prepare: (page: Page) => new EditPopkinDialog(page).name.focus(),
    }),
  ),
  // Sign out: the focus starts on "Stay signed in".
  {
    key: 'signOut',
    ...accountStates.signOut,
    name: 'sign-out',
    region: (page) => new SignOutDialog(page).panel,
    prepare: async (page) => {
      await page.keyboard.press('Shift');
      await new SignOutDialog(page).stay.focus();
    },
  },
  {
    key: 'deleteAccount',
    ...accountStates.deleteAccount,
    name: 'delete-account',
    region: (page) => new DeleteAccountDialog(page).panel,
  },
  {
    key: 'deleteAccountConfirm',
    ...accountStates.deleteAccountConfirm,
    name: 'delete-account-confirm',
    region: (page) => new DeleteAccountDialog(page).panel,
  },
  {
    key: 'deleteAccountBusy',
    ...accountStates.deleteAccountBusy,
    name: 'delete-account-busy',
    region: (page) => new DeleteAccountDialog(page).panel,
  },
  // Journey 12: the message actions of theirs, of the member's own, with More reactions open.
  {
    key: 'reactions',
    ...reactStates.reactions,
    name: 'reactions',
    region: (page) => new ReactionsDialog(page).panel,
  },
  {
    key: 'reactionsMine',
    ...reactStates.reactionsMine,
    name: 'reactions-mine',
    region: (page) => new ReactionsDialog(page).panel,
  },
  {
    key: 'reactionsMore',
    ...reactStates.reactionsMore,
    name: 'reactions-more',
    region: (page) => new ReactionsDialog(page).panel,
  },
  // Delete this message?: the focus starts on Keep.
  {
    key: 'deleteMessage',
    ...reactStates.deleteMessage,
    name: 'delete-message',
    region: (page) => new DeleteMessageDialog(page).panel,
    prepare: async (page) => {
      await page.keyboard.press('Shift');
      await new DeleteMessageDialog(page).keep.focus();
    },
  },
]);
