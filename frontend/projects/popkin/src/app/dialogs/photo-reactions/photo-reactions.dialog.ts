import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MORE_REACTIONS } from 'api';
import { DialogFrame, ReactionGrid } from 'components';

export interface PhotoReactionsData {
  accent: string;
  /** The emoji the member has given this photo. */
  pressed: readonly string[];
}

/**
 * "More reactions" of a photo (L2-034 AC1): the reactions behind the react bar's five. It closes
 * with the emoji chosen, for the photo view to toggle.
 */
@Component({
  selector: 'pk-photo-reactions-dialog',
  imports: [DialogFrame, ReactionGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-reactions.dialog.html',
})
export class PhotoReactionsDialog {
  protected readonly data = inject<PhotoReactionsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly more = MORE_REACTIONS;

  protected react(emoji: string): void {
    this.ref.close(emoji);
  }
}
