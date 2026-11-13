import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageView } from '../../models/chat';
import { CHAT_API, ChatApi } from './chat-api';
import { MessageOutbox, OUTBOX_STORAGE, OutboxEntry, OutboxStorage } from './message-outbox';
import { NETWORK_STATUS, NetworkStatus } from './network-status';

class FakeNetwork implements NetworkStatus {
  readonly online = signal(true);
  readonly backOnline$ = new Subject<void>();
}

class MemoryStorage implements OutboxStorage {
  held: OutboxEntry[] = [];
  load(): OutboxEntry[] {
    return this.held;
  }
  save(entries: OutboxEntry[]): void {
    this.held = entries;
  }
}

/** Answers each send when the test says so, and records what was asked. */
class FakeChat implements Partial<ChatApi> {
  readonly sends: { text: string; clientMessageId: string; answer: Subject<MessageView> }[] = [];
  readonly discards: string[] = [];

  send(_popkinId: string, threadId: string, clientMessageId: string, text: string) {
    const answer = new Subject<MessageView>();
    this.sends.push({ text, clientMessageId, answer });
    return answer.asObservable();
  }

  discard(_popkinId: string, _threadId: string, clientMessageId: string): Observable<void> {
    this.discards.push(clientMessageId);
    return of(undefined);
  }

  succeed(index: number): void {
    const { answer, clientMessageId, text } = this.sends[index];
    answer.next({ id: `id-${index}`, clientMessageId, text } as MessageView);
    answer.complete();
  }

  fail(index: number, status: number, body: object = {}): void {
    this.sends[index].answer.error(new HttpErrorResponse({ status, error: body }));
  }
}

describe('MessageOutbox (L2-028)', () => {
  let chat: FakeChat;
  let network: FakeNetwork;
  let storage: MemoryStorage;
  let outbox: MessageOutbox;

  const states = () => outbox.entries().map((entry) => `${entry.text}:${entry.state}`);

  beforeEach(() => {
    chat = new FakeChat();
    network = new FakeNetwork();
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        { provide: CHAT_API, useValue: chat },
        { provide: NETWORK_STATUS, useValue: network },
        { provide: OUTBOX_STORAGE, useValue: storage },
      ],
    });
    outbox = TestBed.inject(MessageOutbox);
  });

  it('names a message before sending it and forgets it once the server has it', () => {
    const sent: MessageView[] = [];
    outbox.sent$.subscribe((message) => sent.push(message));

    const entry = outbox.enqueue('p', 't', 'hello');

    expect(entry.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(chat.sends[0]).toMatchObject({ text: 'hello', clientMessageId: entry.clientMessageId });
    expect(states()).toEqual(['hello:Sending']);

    chat.succeed(0);

    expect(outbox.entries()).toEqual([]);
    expect(sent.map((message) => message.clientMessageId)).toEqual([entry.clientMessageId]);
  });

  it('sends one message of a thread at a time, oldest first', () => {
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');
    expect(chat.sends.map((send) => send.text)).toEqual(['one']);

    chat.succeed(0);
    expect(chat.sends.map((send) => send.text)).toEqual(['one', 'two']);
  });

  it('does not hold one thread up behind another', () => {
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 'u', 'other');
    expect(chat.sends.map((send) => send.text)).toEqual(['one', 'other']);
  });

  it.each([
    [0, 'network'],
    [500, 'network'],
    [503, 'network'],
  ] as const)(
    'marks a send that fails with %i "Not sent" and holds the queue behind it',
    (status, failure) => {
      outbox.enqueue('p', 't', 'one');
      outbox.enqueue('p', 't', 'two');

      chat.fail(0, status);

      expect(outbox.entries()[0]).toMatchObject({ state: 'Failed', failure });
      expect(chat.sends).toHaveLength(1);
    },
  );

  it('marks a refused message "Not sent" and carries on with the next', () => {
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');

    chat.fail(0, 400, { code: 'message_too_long' });

    expect(outbox.entries()[0]).toMatchObject({ state: 'Failed', failure: 'rejected' });
    expect(chat.sends.map((send) => send.text)).toEqual(['one', 'two']);
  });

  it('says how long to wait when the send is rate limited (L2-053 AC4)', () => {
    const waits: (number | undefined)[] = [];
    outbox.rateLimited$.subscribe((seconds) => waits.push(seconds));
    outbox.enqueue('p', 't', 'one');

    chat.fail(0, 429, { code: 'rate_limited', retryAfterSeconds: 30 });

    expect(outbox.entries()[0]).toMatchObject({ state: 'Failed', failure: 'rate_limited' });
    expect(waits).toEqual([30]);
  });

  it('tries again under the same name, then sends what waited behind', () => {
    const first = outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');
    chat.fail(0, 0);

    outbox.retry(first.clientMessageId);

    expect(chat.sends[1].clientMessageId).toBe(first.clientMessageId);
    expect(states()).toEqual(['one:Sending', 'two:Sending']);
    chat.succeed(1);
    expect(chat.sends[2].text).toBe('two');
  });

  it('deletes a message that failed, on the server too in case the answer was lost', () => {
    const first = outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');
    chat.fail(0, 0);

    outbox.discard(first.clientMessageId);

    expect(chat.discards).toEqual([first.clientMessageId]);
    expect(states()).toEqual(['two:Sending']);
    expect(chat.sends[1].text).toBe('two');
  });

  it('does not ask the server to delete a message it refused', () => {
    const first = outbox.enqueue('p', 't', 'one');
    chat.fail(0, 400, { code: 'message_empty' });

    outbox.discard(first.clientMessageId);

    expect(chat.discards).toEqual([]);
    expect(outbox.entries()).toEqual([]);
  });

  it('keeps messages written offline and sends them in order when the connection returns', () => {
    network.online.set(false);
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');
    expect(states()).toEqual(['one:Waiting', 'two:Waiting']);
    expect(chat.sends).toEqual([]);

    network.online.set(true);
    const count = outbox.sendWaiting();

    expect(count).toBe(2);
    expect(chat.sends.map((send) => send.text)).toEqual(['one']);
    chat.succeed(0);
    expect(chat.sends.map((send) => send.text)).toEqual(['one', 'two']);
  });

  it('drops what waits for a Popkin that has wrapped up', () => {
    const wrapped: string[] = [];
    outbox.wrappedUp$.subscribe((popkinId) => wrapped.push(popkinId));
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 't', 'two');
    outbox.enqueue('q', 'v', 'elsewhere');

    chat.fail(0, 409, { code: 'popkin_wrapped_up' });

    expect(states()).toEqual(['elsewhere:Sending']);
    expect(wrapped).toEqual(['p']);
  });

  it('writes every change to the device, so a reload loses nothing', () => {
    network.online.set(false);
    outbox.enqueue('p', 't', 'one');
    expect(storage.held.map((entry) => entry.text)).toEqual(['one']);
  });

  it('holds what a reload found as waiting, and sends it when asked', () => {
    storage.held = [
      {
        clientMessageId: 'c1',
        popkinId: 'p',
        threadId: 't',
        text: 'kept',
        state: 'Sending',
        createdAt: '',
      },
    ];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CHAT_API, useValue: chat },
        { provide: NETWORK_STATUS, useValue: network },
        { provide: OUTBOX_STORAGE, useValue: storage },
      ],
    });
    outbox = TestBed.inject(MessageOutbox);

    expect(states()).toEqual(['kept:Waiting']);
    expect(outbox.sendWaiting()).toBe(1);
    expect(chat.sends[0].clientMessageId).toBe('c1');
  });

  it('lists a thread’s own messages only', () => {
    outbox.enqueue('p', 't', 'one');
    outbox.enqueue('p', 'u', 'other');
    expect(outbox.forThread('t').map((entry) => entry.text)).toEqual(['one']);
  });

  it('marks a send the server never answers "Not sent" after 15 seconds', () => {
    vi.useFakeTimers();
    try {
      outbox.enqueue('p', 't', 'one');
      vi.advanceTimersByTime(14_999);
      expect(states()).toEqual(['one:Sending']);
      vi.advanceTimersByTime(1);
      expect(outbox.entries()[0]).toMatchObject({ state: 'Failed', failure: 'network' });
    } finally {
      vi.useRealTimers();
    }
  });
});
