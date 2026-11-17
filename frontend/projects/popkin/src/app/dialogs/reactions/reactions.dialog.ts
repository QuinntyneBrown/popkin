import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MORE_REACTIONS, MessageAction, MessageActionsData, QUICK_REACTIONS } from 'api';
import { DialogFrame, MenuItem, MenuList, Quote, ReactionGrid } from 'components';

/**
 * "Message actions" (L2-024 AC1): the five quick reactions, More reactions, Reply, Copy and,
 * on the member's own message, Delete. It closes with the one chosen.
 */
@Component({
  selector: 'pk-reactions-dialog',
  imports: [DialogFrame, MenuItem, MenuList, NgTemplateOutlet, Quote, ReactionGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reactions.dialog.html',
})
export class ReactionsDialog {
  protected readonly data = inject<MessageActionsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<MessageAction>>(DialogRef);

  protected readonly quick = QUICK_REACTIONS;
  protected readonly more = MORE_REACTIONS;
  protected readonly showMore = signal(false);

  protected choose(action: MessageAction): void {
    this.ref.close(action);
  }

  protected react(emoji: string): void {
    this.choose({ kind: 'react', emoji });
  }
}
