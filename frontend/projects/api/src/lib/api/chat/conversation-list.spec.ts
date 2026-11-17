import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAT_DIALOGS, ChatDialogs, NewMessageData } from './chat-dialogs';
import { ConversationList } from './conversation-list';
import { ConversationRow, ConversationsStore, EveryoneCard } from './conversations-store';

const walt: ConversationRow = {
  threadId: 't-walt',
  memberId: 'm-walt',
  name: 'Walt Brennan',
  avatar: { initials: 'WB', accent: 'Leaf', photoUrl: null },
  latest: 'You: see you there',
  time: '9:41',
  unread: true,
};

const everyone: EveryoneCard = {
  threadId: 't-everyone',
  latest: 'Mara: last call for the canoe sign-up',
  time: '9:24',
  unread: 3,
  unreadLabel: '3 unread',
};

describe('ConversationList (L2-022)', () => {
  let list: ConversationList;
  let opened: string[];
  let chosen: Subject<string | undefined>;
  let asked: NewMessageData[];
  const navigate = vi.fn(() => Promise.resolve(true));
  const card = signal<EveryoneCard | null>(everyone);
  const rows = signal<ConversationRow[]>([walt]);

  beforeEach(() => {
    opened = [];
    asked = [];
    chosen = new Subject();
    navigate.mockClear();
    const dialogs: Partial<ChatDialogs> = {
      newMessage: (data) => {
        asked.push(data);
        return chosen;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        ConversationList,
        {
          provide: ConversationsStore,
          useValue: { everyone: card, rows, open: (id: string) => opened.push(id) },
        },
        { provide: CHAT_DIALOGS, useValue: dialogs },
        { provide: Router, useValue: { navigate } },
      ],
    });
    list = TestBed.inject(ConversationList);
    list.open('lakeside');
  });

  it('reads the Popkin’s conversations', () => {
    expect(opened).toEqual(['lakeside']);
  });

  it('shows Everyone with the Popkin’s emoji, linking to its thread', () => {
    list.setEmoji('🏕️');

    expect(list.everyone()).toEqual({
      emoji: '🏕️',
      link: ['/p', 'lakeside', 'chat', 'everyone'],
      time: '9:24',
      latest: 'Mara: last call for the canoe sign-up',
      unread: 3,
    });
  });

  it('counts nothing on Everyone beside the Everyone thread, which is being read', () => {
    expect(list.everyoneOpen()?.unread).toBe(0);
    expect(list.everyone()?.unread).toBe(3);
  });

  it('has no Everyone card until the store has one', () => {
    card.set(null);
    expect(list.everyone()).toBeNull();
    expect(list.everyoneOpen()).toBeNull();
    card.set(everyone);
  });

  it('shows each direct message with the other member’s colour, linking to it', () => {
    expect(list.direct()).toEqual([
      {
        key: 'm-walt',
        name: 'Walt Brennan',
        avatar: { initials: 'WB', accent: 'leaf', photoUrl: null },
        link: ['/p', 'lakeside', 'chat', 'm-walt'],
        time: '9:41',
        latest: 'You: see you there',
        unread: true,
      },
    ]);
  });

  it('opens the direct message with the member chosen in New message (L2-022 AC4)', () => {
    list.newMessage('Lakeside Weekend', 'teal');
    chosen.next('m-walt');
    chosen.complete();

    expect(asked).toEqual([
      { popkinId: 'lakeside', popkinName: 'Lakeside Weekend', accent: 'teal' },
    ]);
    expect(navigate).toHaveBeenCalledWith(['/p', 'lakeside', 'chat', 'm-walt']);
  });

  it('opens nothing when New message closes with no one chosen', () => {
    list.newMessage('Lakeside Weekend', 'teal');
    chosen.next(undefined);
    chosen.complete();

    expect(navigate).not.toHaveBeenCalled();
  });
});
