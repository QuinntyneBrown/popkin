import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MessagePageView, MessageView, PresenceView, ThreadView } from '../../models/chat';
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
  ): Observable<MessageView>;
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
  ): Observable<MessageView> {
    return this.http.post<MessageView>(`${thread(popkinId, threadId)}/messages`, {
      clientMessageId,
      text,
    });
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
