import { MessageView, QuoteView } from '../../models/chat';
import { AvatarView } from '../../models/invite';
import type { OutboxEntry } from './message-outbox';
import { ReactionChip, reactionChips } from './reactions';
import { dayLabel, messageTime, noteParts } from './thread-text';

/** A row of a thread as its screen draws it: a day's divider, a note, or a message. */
export type ThreadRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'note'; key: string; name: string; text: string }
  | MessageRow;

export interface MessageRow {
  kind: 'message';
  key: string;
  /** The server's id; null while the message is still only on the device. */
  id: string | null;
  clientMessageId: string | null;
  mine: boolean;
  /** The first of a run from one person: it carries the name and avatar (L2-021 AC2). */
  lead: boolean;
  name: string;
  avatar: AvatarView | null;
  text: string;
  time: string;
  state: 'sent' | 'sending' | 'waiting' | 'failed';
  reactions: ReactionChip[];
  /** What it quotes of the message it replies to (L2-025). */
  quote: ReplyQuote | null;
  /** The photo it carries (L2-026); its id is null while it is still on the device. */
  photo: RowPhoto | null;
}

export interface RowPhoto {
  id: string | null;
  url: string;
  /** "Photo from Dev", or "Your photo". */
  alt: string;
  /** The name of the link that opens it full screen. */
  label: string;
  /** The photo view it opens (L2-026 AC2); null while it is still on the device. */
  link: string[] | null;
}

function rowPhoto(
  popkinId: string,
  id: string | null,
  url: string,
  mine: boolean,
  firstName: string,
): RowPhoto {
  const link = id ? ['/p', popkinId, 'photos', id] : null;
  return mine
    ? { id, url, alt: 'Your photo', label: 'Open your photo', link }
    : { id, url, alt: `Photo from ${firstName}`, label: `Open photo from ${firstName}`, link };
}

/** The quote in a reply: a deleted message keeps its id only and reads "Message deleted". */
export interface ReplyQuote {
  messageId: string;
  firstName: string;
  snippet: string;
  deleted: boolean;
}

function replyQuote(quote: QuoteView | null): ReplyQuote | null {
  if (!quote) return null;
  return {
    messageId: quote.messageId,
    firstName: quote.authorFirstName ?? '',
    snippet: quote.snippet ?? '',
    deleted: quote.deleted,
  };
}

const SHOWN_AS = { Sending: 'sending', Waiting: 'waiting', Failed: 'failed' } as const;

/**
 * Adds messages to those shown, dropping any already there, and keeps the order of sending
 * (then of id, as the API orders them): an echo or a repeated event never doubles a message.
 */
export function mergeMessages(
  shown: readonly MessageView[],
  incoming: readonly MessageView[],
): MessageView[] {
  const byId = new Map(shown.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      Date.parse(a.sentAt) - Date.parse(b.sentAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/**
 * The rows of a thread: the messages the server holds, oldest first, then those still on the
 * device in the order they were written, with a divider before each day's first row.
 */
export function threadRows(
  messages: readonly MessageView[],
  pending: readonly OutboxEntry[],
  viewerMembershipId: string,
  now: Date,
): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let day = '';
  let lastAuthor: string | null = null;

  const startDay = (at: Date): void => {
    const label = dayLabel(at, now);
    if (label === day) return;
    day = label;
    lastAuthor = null;
    rows.push({ kind: 'day', key: `day-${label}`, label });
  };

  for (const message of messages) {
    const sentAt = new Date(message.sentAt);
    startDay(sentAt);
    if (message.kind === 'System') {
      rows.push({ kind: 'note', key: message.id, ...noteParts(message.text) });
      lastAuthor = null;
      continue;
    }
    const author = message.author.membershipId;
    rows.push({
      kind: 'message',
      key: message.clientMessageId ?? message.id,
      id: message.id,
      clientMessageId: message.clientMessageId,
      mine: author === viewerMembershipId,
      lead: author !== lastAuthor,
      name: message.author.firstName,
      avatar: message.author.avatar,
      text: message.text,
      time: messageTime(sentAt),
      state: 'sent',
      reactions: reactionChips(message.reactions, viewerMembershipId),
      quote: replyQuote(message.quote),
      photo: message.photo
        ? rowPhoto(
            message.popkinId,
            message.photo.id,
            message.photo.url,
            author === viewerMembershipId,
            message.author.firstName,
          )
        : null,
    });
    lastAuthor = author;
  }

  const stored = new Set(messages.map((message) => message.clientMessageId));
  for (const entry of pending) {
    if (stored.has(entry.clientMessageId)) continue;
    const createdAt = new Date(entry.createdAt);
    startDay(createdAt);
    rows.push({
      kind: 'message',
      key: entry.clientMessageId,
      id: null,
      clientMessageId: entry.clientMessageId,
      mine: true,
      lead: lastAuthor !== viewerMembershipId,
      name: '',
      avatar: null,
      text: entry.text,
      time: messageTime(createdAt),
      state: SHOWN_AS[entry.state],
      reactions: [],
      quote: entry.replyTo ?? null,
      photo: entry.photo?.preview
        ? rowPhoto(entry.popkinId, null, entry.photo.preview, true, '')
        : null,
    });
    lastAuthor = viewerMembershipId;
  }
  return rows;
}
