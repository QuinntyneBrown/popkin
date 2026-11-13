import { Dialog } from '@angular/cdk/dialog';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConversationsStore, accentOf } from 'api';
import { DirectConversation, EveryoneConversation } from 'components';
import { NewMessageData, NewMessageDialog } from '../../dialogs/new-message/new-message.dialog';

/**
 * The list of a member's conversations as the Chat tab and the list pane beside a thread show
 * it (L2-022), and "New message", which opens the direct message with the member chosen.
 */
@Injectable()
export class ConversationList {
  readonly store = inject(ConversationsStore);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private popkinId = '';
  private readonly emoji = signal('');

  readonly everyone = computed<EveryoneConversation | null>(() => {
    const card = this.store.everyone();
    return card
      ? {
          emoji: this.emoji(),
          link: ['/p', this.popkinId, 'chat', 'everyone'],
          time: card.time,
          latest: card.latest,
          unread: card.unread,
        }
      : null;
  });

  /** The Everyone card beside the Everyone thread: it is being read, so it counts nothing. */
  readonly everyoneOpen = computed<EveryoneConversation | null>(() => {
    const card = this.everyone();
    return card ? { ...card, unread: 0 } : null;
  });

  readonly direct = computed<DirectConversation[]>(() =>
    this.store.rows().map((row) => ({
      key: row.memberId,
      name: row.name,
      avatar: {
        initials: row.avatar.initials,
        accent: accentOf(row.avatar.accent),
        photoUrl: row.avatar.photoUrl,
      },
      link: ['/p', this.popkinId, 'chat', row.memberId],
      time: row.time,
      latest: row.latest,
      unread: row.unread,
    })),
  );

  open(popkinId: string): void {
    this.popkinId = popkinId;
    this.store.open(popkinId);
  }

  /** The Everyone card's tile, once the Popkin is known. */
  setEmoji(emoji: string): void {
    this.emoji.set(emoji);
  }

  newMessage(popkinName: string, accent: string): void {
    const popkinId = this.popkinId;
    this.dialog
      .open<string, NewMessageData>(NewMessageDialog, {
        data: { popkinId, popkinName, accent },
        ariaLabelledBy: 'dlg-title',
        autoFocus: 'input[type=search]',
        // pk-dialog draws its own backdrop, as the mocks do.
        hasBackdrop: false,
        ariaModal: true,
      })
      .closed.subscribe((memberId) => {
        if (memberId) void this.router.navigate(['/p', popkinId, 'chat', memberId]);
      });
  }
}
