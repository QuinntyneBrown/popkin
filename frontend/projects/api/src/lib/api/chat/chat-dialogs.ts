import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';

/** What is chosen in Message actions (L2-024 AC1). */
export type MessageAction =
  { kind: 'react'; emoji: string } | { kind: 'reply' } | { kind: 'copy' } | { kind: 'delete' };

/** What Message actions shows of the message it opens over. */
export interface MessageActionsData {
  accent: string;
  name: string;
  /** The text it quotes: "Photo" for a photo alone (L2-026). */
  text: string;
  canCopy: boolean;
  /** The member's own reactions to it, kept current while it is open. */
  pressed: Signal<string[]>;
  mine: boolean;
}

/** What New message needs to list the Popkin's members. */
export interface NewMessageData {
  popkinId: string;
  popkinName: string;
  accent: string;
}

/**
 * The dialogs a chat screen opens (L2-022 AC4, L2-024). Each answers what was chosen, or
 * nothing when the dialog was closed. The app provides them, in `app.config.ts`.
 */
export interface ChatDialogs {
  /** New message: answers the member chosen. */
  newMessage(data: NewMessageData): Observable<string | undefined>;
  messageActions(data: MessageActionsData): Observable<MessageAction | undefined>;
  /** Delete this message?: answers true when they choose Delete. */
  confirmDeleteMessage(accent: string): Observable<boolean | undefined>;
}

export const CHAT_DIALOGS = new InjectionToken<ChatDialogs>('ChatDialogs');
