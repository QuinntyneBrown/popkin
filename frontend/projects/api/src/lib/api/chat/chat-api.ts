import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConversationsView,
  MessagePageView,
  MessageView,
  PresenceView,
  ThreadView,
  ChatPhotoView,
  MessageReactions,
} from '../../models/chat';
import { ChatPreviewView } from '../../models/home';

/** Which page of a thread to read; none is the latest. Pages hold 50 messages (L2-027 AC5). */
export type MessagesCursor =
  { before: string } | { after: string } | { from: string; to: string } | undefined;

/** A Popkin's threads and messages (docs/detailed-designs/chat). */
export interface ChatApi {
  /** 404 `popkin_not_found` for someone who is not a member. */
  getEveryone(popkinId: string): Observable<ThreadView>;
  /** The latest of the Everyone thread, for the Popkin's home (L2-019 AC3). */
  getEveryonePreview(popkinId: string): Observable<ChatPreviewView>;
  /** The member's threads in a Popkin: Everyone, and their direct messages (L2-022). */
  listThreads(popkinId: string): Observable<ConversationsView>;
  /**
   * The direct message with another member, made if there is none yet (L2-023). 400
   * `cannot_message_self`; 404 `popkin_not_found`, `member_not_found`; 409 `popkin_wrapped_up`
   * when there is none yet and the Popkin has wrapped up.
   */
  openDirect(popkinId: string, memberId: string): Observable<ThreadView>;
  getMessages(
    popkinId: string,
    threadId: string,
    cursor?: MessagesCursor,
  ): Observable<MessagePageView>;
  /**
   * Sends a message the device has named. Repeating a name returns the stored message, so a
   * retry never doubles it. 400 `message_empty`, `message_too_long`; 409 `popkin_wrapped_up`;
   * 429 `rate_limited`.
   */
  send(
    popkinId: string,
    threadId: string,
    clientMessageId: string,
    text: string,
    replyToMessageId?: string,
    photoId?: string,
  ): Observable<MessageView>;
  /**
   * Adds the member's reaction with this emoji, if it is not there yet, and answers the
   * message's reactions (L2-024). 400 `reaction_invalid`; 404 `message_not_found`; 409
   * `popkin_wrapped_up`.
   */
  react(
    popkinId: string,
    threadId: string,
    messageId: string,
    emoji: string,
  ): Observable<MessageReactions>;
  /** Removes the member's reaction with this emoji, if it is there, and answers the rest. */
  unreact(
    popkinId: string,
    threadId: string,
    messageId: string,
    emoji: string,
  ): Observable<MessageReactions>;
  /**
   * Uploads a photo for a message of this thread, before the message is sent (L2-026). 400
   * `photo_type_not_allowed` or `photo_too_large`.
   */
  uploadPhoto(popkinId: string, threadId: string, file: File): Observable<ChatPhotoView>;
  /** Deletes the member's own message for everyone. 403 `not_message_author`. */
  deleteMessage(popkinId: string, threadId: string, messageId: string): Observable<void>;
  /** Removes the member's own message of that name, if the server holds one. */
  discard(popkinId: string, threadId: string, clientMessageId: string): Observable<void>;
  /** Moves the member's read point forward to this message; it never moves back. */
  markRead(popkinId: string, threadId: string, lastReadMessageId: string): Observable<void>;
  getPresence(popkinId: string): Observable<PresenceView>;
}

export const CHAT_API = new InjectionToken<ChatApi>('ChatApi');

@Injectable()
export class HttpChatApi implements ChatApi {
  private readonly http = inject(HttpClient);

  getEveryone(popkinId: string): Observable<ThreadView> {
    return this.http.get<ThreadView>(`${popkin(popkinId)}/threads/everyone`);
  }

  getEveryonePreview(popkinId: string): Observable<ChatPreviewView> {
    return this.http.get<ChatPreviewView>(`${popkin(popkinId)}/threads/everyone/preview`);
  }

  listThreads(popkinId: string): Observable<ConversationsView> {
    return this.http.get<ConversationsView>(`${popkin(popkinId)}/threads`);
  }

  openDirect(popkinId: string, memberId: string): Observable<ThreadView> {
    return this.http.put<ThreadView>(
      `${popkin(popkinId)}/threads/direct/${encodeURIComponent(memberId)}`,
      null,
    );
  }

  getMessages(
    popkinId: string,
    threadId: string,
    cursor?: MessagesCursor,
  ): Observable<MessagePageView> {
    return this.http.get<MessagePageView>(`${thread(popkinId, threadId)}/messages`, {
      params: new HttpParams({ fromObject: { ...cursor } }),
    });
  }

  send(
    popkinId: string,
    threadId: string,
    clientMessageId: string,
    text: string,
    replyToMessageId?: string,
    photoId?: string,
  ): Observable<MessageView> {
    return this.http.post<MessageView>(`${thread(popkinId, threadId)}/messages`, {
      clientMessageId,
      text,
      ...(replyToMessageId ? { replyToMessageId } : {}),
      ...(photoId ? { photoId } : {}),
    });
  }

  uploadPhoto(popkinId: string, threadId: string, file: File): Observable<ChatPhotoView> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ChatPhotoView>(`${thread(popkinId, threadId)}/photos`, body);
  }

  react(
    popkinId: string,
    threadId: string,
    messageId: string,
    emoji: string,
  ): Observable<MessageReactions> {
    return this.http.put<MessageReactions>(reaction(popkinId, threadId, messageId, emoji), null);
  }

  unreact(
    popkinId: string,
    threadId: string,
    messageId: string,
    emoji: string,
  ): Observable<MessageReactions> {
    return this.http.delete<MessageReactions>(reaction(popkinId, threadId, messageId, emoji));
  }

  deleteMessage(popkinId: string, threadId: string, messageId: string): Observable<void> {
    return this.http.delete<void>(
      `${thread(popkinId, threadId)}/messages/${encodeURIComponent(messageId)}`,
    );
  }

  discard(popkinId: string, threadId: string, clientMessageId: string): Observable<void> {
    return this.http.delete<void>(
      `${thread(popkinId, threadId)}/messages/client/${encodeURIComponent(clientMessageId)}`,
    );
  }

  markRead(popkinId: string, threadId: string, lastReadMessageId: string): Observable<void> {
    return this.http.put<void>(`${thread(popkinId, threadId)}/read`, { lastReadMessageId });
  }

  getPresence(popkinId: string): Observable<PresenceView> {
    return this.http.get<PresenceView>(`${popkin(popkinId)}/presence`);
  }
}

function popkin(popkinId: string): string {
  return `/api/popkins/${encodeURIComponent(popkinId)}`;
}

function thread(popkinId: string, threadId: string): string {
  return `${popkin(popkinId)}/threads/${encodeURIComponent(threadId)}`;
}

function reaction(popkinId: string, threadId: string, messageId: string, emoji: string): string {
  return `${thread(popkinId, threadId)}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`;
}
