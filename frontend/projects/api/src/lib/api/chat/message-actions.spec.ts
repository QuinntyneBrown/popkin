import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../toasts/toaster';
import { CHAT_DIALOGS, ChatDialogs, MessageAction, MessageActionsData } from './chat-dialogs';
import { MessageActions } from './message-actions';
import { MessageRow, ThreadRow } from './thread-rows';
import { ThreadFailure, ThreadStore } from './thread-store';

function row(extra: Partial<MessageRow> = {}): MessageRow {
  return {
    kind: 'message',
    key: 'k1',
    id: 'id-1',
    clientMessageId: null,
    mine: false,
    lead: true,
    name: 'Walt',
    avatar: null,
    text: 'see you there',
    time: '9:41',
    state: 'sent',
    reactions: [],
    quote: null,
    photo: null,
    photoRemoved: false,
    ...extra,
  };
}

describe('MessageActions (L2-024, L2-025)', () => {
  let actions: MessageActions;
  let shown: MessageActionsData[];
  let chosen: Subject<MessageAction | undefined>;
  let confirm: Subject<boolean | undefined>;
  const failures = new Subject<ThreadFailure>();
  const thread = signal<{ readOnly: boolean } | null>({ readOnly: false });
  const rows = signal<ThreadRow[]>([]);
  const store = {
    failures$: failures,
    thread,
    rows,
    toggleReaction: vi.fn(),
    startReply: vi.fn(),
    deleteMessage: vi.fn(),
  };
  const toaster = { show: vi.fn() };
  const writeText = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    shown = [];
    chosen = new Subject();
    confirm = new Subject();
    Object.values(store).forEach((value) => vi.isMockFunction(value) && value.mockClear());
    toaster.show.mockClear();
    thread.set({ readOnly: false });
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const dialogs: Partial<ChatDialogs> = {
      messageActions: (data) => {
        shown.push(data);
        return chosen;
      },
      confirmDeleteMessage: () => confirm,
    };
    TestBed.configureTestingModule({
      providers: [
        MessageActions,
        { provide: ThreadStore, useValue: store },
        { provide: CHAT_DIALOGS, useValue: dialogs },
        { provide: Toaster, useValue: toaster },
      ],
    });
    actions = TestBed.inject(MessageActions);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('offers the actions of a sent message in an open thread', () => {
    expect(actions.actionable(row())).toBe(true);
  });

  it('offers nothing on a message not yet sent, or one without its server id', () => {
    expect(actions.actionable(row({ state: 'sending' }))).toBe(false);
    expect(actions.actionable(row({ id: null }))).toBe(false);
  });

  it('offers nothing in a Popkin that has wrapped up (L2-045)', () => {
    thread.set({ readOnly: true });
    expect(actions.actionable(row())).toBe(false);
  });

  it('shows the message, and the member’s own reactions as they change', () => {
    rows.set([row({ reactions: [{ emoji: '❤️', count: 2, mine: true, label: '' } as never] })]);

    actions.open(row({ mine: true }), 'teal');

    expect(shown[0]).toMatchObject({
      accent: 'teal',
      name: 'Walt',
      text: 'see you there',
      canCopy: true,
      mine: true,
    });
    expect(shown[0].pressed()).toEqual(['❤️']);
    rows.set([row()]);
    expect(shown[0].pressed()).toEqual([]);
  });

  it('quotes a photo alone as "Photo", with nothing to copy (L2-026)', () => {
    actions.open(row({ text: '', photo: { id: 'ph', url: 'u' } as never }), 'teal');

    expect(shown[0]).toMatchObject({ text: 'Photo', canCopy: false });
  });

  it('opens nothing for a message that offers no actions', () => {
    actions.open(row({ state: 'failed' }), 'teal');
    expect(shown).toEqual([]);
  });

  it('reacts, replies or copies as chosen', async () => {
    actions.open(row(), 'teal');
    chosen.next({ kind: 'react', emoji: '🔥' });
    actions.open(row(), 'teal');
    chosen.next({ kind: 'reply' });
    actions.open(row(), 'teal');
    chosen.next({ kind: 'copy' });
    await Promise.resolve();

    expect(store.toggleReaction).toHaveBeenCalledWith('id-1', '🔥');
    expect(store.startReply).toHaveBeenCalledWith('id-1');
    expect(writeText).toHaveBeenCalledWith('see you there');
    expect(toaster.show).toHaveBeenCalledWith('success', 'Message copied.');
  });

  it('deletes only once Delete this message? is confirmed (L2-024 AC1)', () => {
    actions.open(row({ mine: true }), 'teal');
    chosen.next({ kind: 'delete' });
    expect(store.deleteMessage).not.toHaveBeenCalled();

    confirm.next(true);

    expect(store.deleteMessage).toHaveBeenCalledWith('id-1');
  });

  it('deletes nothing when they keep it', () => {
    actions.open(row({ mine: true }), 'teal');
    chosen.next({ kind: 'delete' });
    confirm.next(false);

    expect(store.deleteMessage).not.toHaveBeenCalled();
  });

  it('reacts from the quick bar on a message that offers actions', () => {
    actions.react(row(), '👍');
    actions.react(row({ state: 'waiting' }), '👍');

    expect(store.toggleReaction).toHaveBeenCalledTimes(1);
  });

  it('says so when a reaction or a deletion did not save, with Try again', () => {
    const retry = vi.fn();
    failures.next({ kind: 'reaction', retry });
    failures.next({ kind: 'delete', retry });

    expect(toaster.show).toHaveBeenNthCalledWith(
      1,
      'danger',
      'We couldn’t save your reaction.',
      undefined,
      { label: 'Try again', run: retry },
    );
    expect(toaster.show).toHaveBeenNthCalledWith(
      2,
      'danger',
      'We couldn’t delete your message.',
      undefined,
      { label: 'Try again', run: retry },
    );
  });
});
