import { describe, expect, it } from 'vitest';
import { MessageView } from '../../models/chat';
import { OutboxEntry } from './message-outbox';
import { mergeMessages, threadRows } from './thread-rows';

const now = new Date(2026, 8, 12, 12, 0);
const mara = 'm-mara';

function message(
  id: string,
  author: string,
  at: Date,
  text = id,
  extra: Partial<MessageView> = {},
): MessageView {
  return {
    id,
    popkinId: 'p',
    threadId: 't',
    clientMessageId: `c-${id}`,
    kind: 'Member',
    author: {
      membershipId: `m-${author.toLowerCase()}`,
      firstName: author,
      avatar: { initials: author.slice(0, 2).toUpperCase(), accent: 'Teal', photoUrl: null },
    },
    text,
    sentAt: at.toISOString(),
    reactions: [],
    reactionsVersion: 0,
    photo: null,
    photoRemoved: false,
    quote: null,
    ...extra,
  };
}

function pending(id: string, state: OutboxEntry['state'], at: Date): OutboxEntry {
  return {
    clientMessageId: id,
    popkinId: 'p',
    threadId: 't',
    text: id,
    state,
    createdAt: at.toISOString(),
  };
}

const at = (hour: number, minute = 0, day = 12) => new Date(2026, 8, day, hour, minute);

describe('threadRows', () => {
  it('names each day once, before its first message (L2-021 AC4)', () => {
    const rows = threadRows(
      [
        message('a', 'Walt', at(9, 0, 11)),
        message('b', 'Walt', at(9)),
        message('c', 'Dev', at(10)),
      ],
      [],
      mara,
      now,
    );
    expect(rows.map((row) => (row.kind === 'day' ? row.label : row.kind))).toEqual([
      'Yesterday',
      'message',
      'Today',
      'message',
      'message',
    ]);
  });

  it('shows the name and avatar once for a run from one person (L2-021 AC2)', () => {
    const rows = threadRows(
      [
        message('a', 'Walt', at(9)),
        message('b', 'Walt', at(9, 1)),
        message('c', 'Dev', at(9, 2)),
        message('d', 'Walt', at(9, 3)),
      ],
      [],
      mara,
      now,
    );
    const leads = rows.flatMap((row) => (row.kind === 'message' ? [row.lead] : []));
    expect(leads).toEqual([true, false, true, true]);
  });

  it('starts a run again after a note and on a new day', () => {
    const rows = threadRows(
      [
        message('a', 'Walt', at(23, 0, 11)),
        message('b', 'Walt', at(9)),
        message('n', 'Joel', at(9, 1), 'Joel Park popped in. Say hi! 👋', {
          kind: 'System',
          clientMessageId: null,
        }),
        message('c', 'Walt', at(9, 2)),
      ],
      [],
      mara,
      now,
    );
    expect(rows.map((row) => (row.kind === 'message' ? row.lead : row.kind))).toEqual([
      'day',
      true,
      'day',
      true,
      'note',
      true,
    ]);
    expect(rows[4]).toMatchObject({ kind: 'note', name: 'Joel Park' });
  });

  it('marks the viewer’s own messages and gives them their time (L2-021 AC3)', () => {
    const rows = threadRows(
      [message('a', 'Mara', at(9, 24)), message('b', 'Walt', at(9, 25))],
      [],
      mara,
      now,
    );
    expect(rows[1]).toMatchObject({ kind: 'message', mine: true, time: '9:24', state: 'sent' });
    expect(rows[2]).toMatchObject({ kind: 'message', mine: false, name: 'Walt' });
  });

  it.each([
    ['Sending', 'sending'],
    ['Waiting', 'waiting'],
    ['Failed', 'failed'],
  ] as const)('puts a message that is %s last, as the viewer’s, in state %s', (state, shown) => {
    const rows = threadRows(
      [message('a', 'Walt', at(9))],
      [pending('p1', state, at(9, 5))],
      mara,
      now,
    );
    expect(rows.at(-1)).toMatchObject({
      kind: 'message',
      mine: true,
      state: shown,
      clientMessageId: 'p1',
      text: 'p1',
    });
  });

  it('gives a message its reaction chips, the member’s own marked (L2-024 AC2)', () => {
    const [, row] = threadRows(
      [
        message('a', 'Walt', at(9), 'Pancakes at 8', {
          reactions: [{ emoji: '🥞', membershipIds: ['m-mara', 'm-dev'] }],
        }),
      ],
      [],
      mara,
      now,
    );
    expect(row).toMatchObject({
      reactions: [{ emoji: '🥞', count: 2, mine: true, label: 'Pancakes, you reacted, 2' }],
    });
  });

  it('gives a reply the quote of the message it answers, or "deleted" (L2-025 AC2, AC4)', () => {
    const rows = threadRows(
      [
        message('a', 'Ellie', at(9), 'Paddles?', {
          quote: { messageId: 'x', authorFirstName: 'Walt', snippet: 'Shed', deleted: false },
        }),
        message('b', 'Ellie', at(9, 1), 'Never mind', {
          quote: { messageId: 'y', authorFirstName: null, snippet: null, deleted: true },
        }),
      ],
      [],
      mara,
      now,
    );
    expect(rows.slice(1).map((row) => (row.kind === 'message' ? row.quote : null))).toEqual([
      { messageId: 'x', firstName: 'Walt', snippet: 'Shed', deleted: false },
      { messageId: 'y', firstName: '', snippet: '', deleted: true },
    ]);
  });

  it('marks a message whose photo was removed (L2-036 AC3)', () => {
    const rows = threadRows(
      [message('a', 'Dev', at(9), 'Dock was glass', { photoRemoved: true })],
      [],
      mara,
      now,
    );
    expect(rows[1]).toMatchObject({ kind: 'message', photo: null, photoRemoved: true });
  });

  it('gives a photo its alt text and the name of the button that opens it (L2-026 AC2)', () => {
    const dock = { id: 'ph-1', url: '/api/files/dock', width: 800, height: 600 };
    const rows = threadRows(
      [
        message('a', 'Dev', at(9), 'Dock was glass', { photo: dock }),
        message('b', 'Mara', at(9, 1), '', { photo: { ...dock, id: 'ph-2' } }),
        message('c', 'Dev', at(9, 2), 'No photo'),
      ],
      [],
      mara,
      now,
    );
    expect(rows.slice(1).map((row) => (row.kind === 'message' ? row.photo : null))).toEqual([
      {
        id: 'ph-1',
        url: '/api/files/dock',
        alt: 'Photo from Dev',
        label: 'Open photo from Dev',
        link: ['/p', 'p', 'photos', 'ph-1'],
      },
      {
        id: 'ph-2',
        url: '/api/files/dock',
        alt: 'Your photo',
        label: 'Open your photo',
        link: ['/p', 'p', 'photos', 'ph-2'],
      },
      null,
    ]);
  });

  it('shows a photo on its way from the device, which opens nothing yet', () => {
    const rows = threadRows(
      [],
      [
        { ...pending('p1', 'Sending', at(9)), photo: { id: null, preview: 'blob:dock' } },
        { ...pending('p2', 'Failed', at(9)), photo: { id: null } },
      ],
      mara,
      now,
    );
    expect(rows.slice(1).map((row) => (row.kind === 'message' ? row.photo : null))).toEqual([
      { id: null, url: 'blob:dock', alt: 'Your photo', label: 'Open your photo', link: null },
      null,
    ]);
  });

  it('shows a message once when the server already has what the device still holds', () => {
    const rows = threadRows(
      [message('a', 'Mara', at(9), 'hello', { clientMessageId: 'p1' })],
      [pending('p1', 'Sending', at(9))],
      mara,
      now,
    );
    expect(rows.filter((row) => row.kind === 'message')).toHaveLength(1);
  });

  it('names the day of a waiting message when the thread has none from that day', () => {
    const rows = threadRows(
      [message('a', 'Walt', at(9, 0, 11))],
      [pending('p1', 'Waiting', at(9))],
      mara,
      now,
    );
    expect(rows.map((row) => (row.kind === 'day' ? row.label : row.kind))).toEqual([
      'Yesterday',
      'message',
      'Today',
      'message',
    ]);
  });
});

describe('mergeMessages', () => {
  it('keeps the order of sending, then of id, whatever order they arrive in', () => {
    const merged = mergeMessages(
      [message('b', 'Walt', at(9, 1))],
      [message('c', 'Dev', at(9, 1)), message('a', 'Dev', at(9))],
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops a message it already shows: an echo or a repeat never doubles', () => {
    const first = message('a', 'Walt', at(9));
    expect(mergeMessages([first], [message('a', 'Walt', at(9))])).toHaveLength(1);
  });
});
