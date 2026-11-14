import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { MORE_REACTIONS, QUICK_REACTIONS } from 'api';
import { DialogFrame, MenuItem, MenuList, Quote, ReactionGrid } from 'components';

export interface ReactionsData {
  accent: string;
  /** Who wrote the message, and what it says, for the quote at the top. */
  name: string;
  text: string;
  /** The emoji the member has reacted with, as they stand: choosing one again takes it away. */
  pressed: Signal<readonly string[]>;
  /** The member's own message may be deleted. */
  mine: boolean;
}

export type MessageAction =
  { kind: 'react'; emoji: string } | { kind: 'reply' } | { kind: 'copy' } | { kind: 'delete' };

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
  protected readonly data = inject<ReactionsData>(DIALOG_DATA);
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
