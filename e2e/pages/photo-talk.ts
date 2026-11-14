import type { Locator, Page } from '@playwright/test';

/**
 * Engaging with a photo in the photo view (L2-034 to L2-036): the react bar and the chips, the
 * comments (the side panel from 1024 px, the Photo comments dialog below it), Save photo, Photo
 * actions and the dialogs they open.
 */
export class PhotoTalkPage {
  readonly reactBar: Locator;
  readonly moreReactions: Locator;
  /** The emoji picker "More reactions" opens. */
  readonly picker: Locator;
  readonly comment: Locator;
  readonly commentCount: Locator;
  readonly save: Locator;
  readonly actions: Locator;
  /** The side panel's comments and field, from 1024 px. */
  readonly panelComments: Locator;
  readonly panelField: Locator;
  readonly panelPost: Locator;
  /** The Photo comments dialog, below 1024 px. */
  readonly dialog: Locator;
  readonly dialogComments: Locator;
  readonly dialogField: Locator;
  readonly dialogPost: Locator;
  readonly dialogEmpty: Locator;
  readonly dialogCount: Locator;
  /** "Delete this comment?". */
  readonly confirmComment: Locator;
  readonly confirmCommentDelete: Locator;
  /** Photo actions, and "Delete this photo?". */
  readonly actionsMenu: Locator;
  readonly deletePhoto: Locator;
  readonly confirmPhoto: Locator;
  readonly confirmPhotoDelete: Locator;
  readonly confirmPhotoProblem: Locator;
  /** The removed state of a photo deleted while it was open. */
  readonly removed: Locator;
  readonly backToPhotos: Locator;

  constructor(private readonly page: Page) {
    const screen = page.locator('.screen--stage');
    const panel = screen.locator('.photo-info');
    this.reactBar = screen.getByRole('group', { name: 'React' });
    this.moreReactions = this.reactBar.getByRole('button', { name: 'More reactions' });
    this.picker = page.getByRole('dialog').getByRole('group', { name: 'More reactions' });
    this.comment = screen.getByRole('button', { name: 'Comment', exact: true });
    this.commentCount = screen.getByRole('button', { name: /^\d+ comments?$/ });
    this.save = screen.getByRole('button', { name: 'Save photo' });
    this.actions = screen.getByRole('button', { name: 'Photo actions' });
    this.panelComments = panel.getByRole('list', { name: 'Comments' }).getByRole('listitem');
    this.panelField = panel.getByRole('textbox', { name: 'Add a comment' });
    this.panelPost = panel.getByRole('button', { name: 'Post comment' });
    this.dialog = page.getByRole('dialog', { name: /^(\d+ comments?|Comments)$/ });
    this.dialogComments = this.dialog.getByRole('listitem');
    this.dialogField = this.dialog.getByRole('textbox', { name: 'Add a comment' });
    this.dialogPost = this.dialog.getByRole('button', { name: 'Post comment' });
    this.dialogEmpty = this.dialog.getByRole('heading', { name: 'No comments yet' });
    this.dialogCount = this.dialog.getByText(/\d+ \/ 500/);
    this.confirmComment = page.getByRole('dialog', { name: 'Delete this comment?' });
    this.confirmCommentDelete = this.confirmComment.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.actionsMenu = page.getByRole('dialog', { name: 'Photo actions' });
    this.deletePhoto = this.actionsMenu.getByRole('button', { name: 'Delete photo' });
    this.confirmPhoto = page.getByRole('dialog', { name: 'Delete this photo?' });
    this.confirmPhotoDelete = this.confirmPhoto.getByRole('button', { name: 'Delete photo' });
    this.confirmPhotoProblem = this.confirmPhoto.getByRole('alert');
    this.removed = screen.getByRole('heading', { name: 'This photo was removed' });
    this.backToPhotos = screen.getByRole('link', { name: 'Back to Photos' });
  }

  /** "React heart", "React fire": a quick reaction of the react bar. */
  quick(name: string): Locator {
    return this.reactBar.getByRole('button', {
      name: `React ${name.toLowerCase()}`,
      exact: true,
    });
  }

  /** The chip of an emoji, named "Heart, 10, you reacted". */
  chip(name: string): Locator {
    return this.page
      .locator('.screen--stage')
      .getByRole('img', { name: new RegExp(`^${name}, \\d+`) });
  }

  /** A comment's Delete, in the list it is in. */
  deleteOf(comment: Locator): Locator {
    return comment.getByRole('button', { name: 'Delete comment' });
  }

  /** A message the page shows for a moment, such as a toast. */
  says(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
