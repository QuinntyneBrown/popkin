import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { ChatDialogs, MessageAction, MessageActionsData, NewMessageData, dialogConfig } from 'api';
import { Observable } from 'rxjs';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialog,
  deleteMessage,
} from './confirm-delete/confirm-delete.dialog';
import { NewMessageDialog } from './new-message/new-message.dialog';
import { ReactionsDialog } from './reactions/reactions.dialog';

/**
 * The chat screens' dialogs (`CHAT_DIALOGS`), opened as CDK dialogs: New message, Message
 * actions and Delete this message?. `app.config.ts` provides it.
 */
@Injectable()
export class CdkChatDialogs implements ChatDialogs {
  private readonly dialog = inject(Dialog);

  newMessage(data: NewMessageData): Observable<string | undefined> {
    return this.dialog.open<string, NewMessageData>(
      NewMessageDialog,
      dialogConfig({ data, autoFocus: 'input[type=search]' }),
    ).closed;
  }

  messageActions(data: MessageActionsData): Observable<MessageAction | undefined> {
    return this.dialog.open<MessageAction, MessageActionsData>(
      ReactionsDialog,
      dialogConfig({ data }),
    ).closed;
  }

  confirmDeleteMessage(accent: string): Observable<boolean | undefined> {
    return this.dialog.open<boolean, ConfirmDeleteData>(
      ConfirmDeleteDialog,
      dialogConfig({ data: deleteMessage(accent), ariaDescribedBy: 'dlg-desc' }),
    ).closed;
  }
}
