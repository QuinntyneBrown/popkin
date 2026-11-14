import { Dialog } from '@angular/cdk/dialog';
import { Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageRow, ThreadStore } from 'api';
import {
  DeleteMessageData,
  DeleteMessageDialog,
} from '../../dialogs/delete-message/delete-message.dialog';
import {
  MessageAction,
  ReactionsData,
  ReactionsDialog,
} from '../../dialogs/reactions/reactions.dialog';
import { Toaster } from '../../toasts/toaster';

/** pk-dialog draws its own backdrop, as the mocks do. */
const MODAL = { ariaLabelledBy: 'dlg-title', hasBackdrop: false, ariaModal: true } as const;

/**
 * What a member does with a message in a thread, the Everyone thread or a direct message
 * (L2-024, L2-025, L2-023 AC3): "Message actions" and what is chosen there, and the toasts of
 * a reaction or a deletion that did not save. The rules are `ThreadStore`'s.
 */
@Injectable()
export class MessageActions {
  private readonly store = inject(ThreadStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);

  constructor() {
    this.store.failures$
      .pipe(takeUntilDestroyed())
      .subscribe((failure) =>
        this.toaster.show(
          'danger',
          failure.kind === 'reaction'
            ? 'We couldn’t save your reaction.'
            : 'We couldn’t delete your message.',
          undefined,
          { label: 'Try again', run: failure.retry },
        ),
      );
  }

  /** Whether a message offers its actions: one that is sent, in a thread that is open. */
  actionable(row: MessageRow): boolean {
    return !!row.id && row.state === 'sent' && !this.store.thread()?.readOnly;
  }

  open(row: MessageRow, accent: string): void {
    const id = row.id;
    if (!id || !this.actionable(row)) return;
    const opened = this.dialog.open<MessageAction, ReactionsData>(ReactionsDialog, {
      data: {
        accent,
        name: row.name,
        // A photo alone is quoted as "Photo", and has no text to copy (L2-026).
        text: row.text || (row.photo ? 'Photo' : ''),
        canCopy: !!row.text,
        pressed: computed(() => {
          const shown = this.store.rows().find((r) => r.kind === 'message' && r.id === id);
          return shown?.kind === 'message'
            ? shown.reactions.filter((chip) => chip.mine).map((chip) => chip.emoji)
            : [];
        }),
        mine: row.mine,
      },
      ...MODAL,
    });
    opened.closed.subscribe((action) => {
      switch (action?.kind) {
        case 'react':
          return this.store.toggleReaction(id, action.emoji);
        case 'reply':
          return this.store.startReply(id);
        case 'copy':
          return this.copy(row.text);
        case 'delete':
          return this.confirmDelete(id, accent);
      }
    });
  }

  react(row: MessageRow, emoji: string): void {
    if (row.id && this.actionable(row)) this.store.toggleReaction(row.id, emoji);
  }

  private copy(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => this.toaster.show('success', 'Message copied.'))
      .catch(() => undefined);
  }

  private confirmDelete(messageId: string, accent: string): void {
    const opened = this.dialog.open<boolean, DeleteMessageData>(DeleteMessageDialog, {
      data: { accent },
      ariaDescribedBy: 'dlg-desc',
      ...MODAL,
    });
    opened.closed.subscribe((deleting) => {
      if (deleting) this.store.deleteMessage(messageId);
    });
  }
}
