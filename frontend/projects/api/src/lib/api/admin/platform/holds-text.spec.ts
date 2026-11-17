import { describe, expect, it } from 'vitest';
import { AdminNotificationHold } from '../../../models/admin';
import {
  heldNote,
  holdBy,
  holdDialog,
  holdLine,
  holdName,
  holdSearchNotes,
  holdUntil,
  releaseDialog,
} from './holds-text';

const popkinHold = (members = 46): AdminNotificationHold => ({
  id: 'hold-1',
  target: 'Popkin',
  automatic: false,
  popkin: {
    id: 'p1',
    name: 'Class of 2015 Reunion',
    emoji: '🎓',
    colour: 'Plum',
    members,
    inviteCode: 'GRAD-1507',
  },
  person: null,
  why: 'Reported for spam invites',
  byName: 'Aiko Tanaka',
  since: '2026-07-12T09:00:00Z',
  until: 'UntilReleased',
});

const personHold: AdminNotificationHold = {
  id: null,
  target: 'Person',
  automatic: true,
  popkin: null,
  person: { id: 'r', name: 'Ruth Lindqvist', email: 'ruth.lindqvist@proton.me', avatar: null },
  why: 'Account suspended',
  byName: 'System',
  since: '2026-07-06T09:00:00Z',
  until: 'WhileSuspended',
};

describe('holds text (L2-172)', () => {
  it('names a Popkin with its members and its code', () => {
    expect(holdName(popkinHold())).toBe('Class of 2015 Reunion');
    expect(holdLine(popkinHold())).toBe('Popkin · 46 members · GRAD-1507');
    expect(holdLine(popkinHold(1))).toBe('Popkin · 1 member · GRAD-1507');
    expect(holdLine(popkinHold(1200))).toBe('Popkin · 1,200 members · GRAD-1507');
  });

  it('names a person with their email', () => {
    expect(holdName(personHold)).toBe('Ruth Lindqvist');
    expect(holdLine(personHold)).toBe('ruth.lindqvist@proton.me');
  });

  it('says who held it and since which day', () => {
    expect(holdBy(popkinHold(), 'UTC')).toBe('Aiko Tanaka · Sun 12 Jul');
    expect(holdBy(personHold, 'UTC')).toBe('System · Mon 6 Jul');
  });

  it.each([
    ['UntilReleased', 'Until released'],
    ['WhileSuspended', 'While suspended'],
    ['UntilDeleted', 'Until deleted'],
  ] as const)('says %s as "%s"', (until, words) => {
    expect(holdUntil(until)).toBe(words);
  });

  it('ends with the suppressed count, or without it until it is known', () => {
    expect(heldNote(1206)).toBe(
      'Suspended and deleting accounts are held automatically. 1,206 addresses that hard-bounced are suppressed by the mail provider and don’t appear here.',
    );
    expect(heldNote(1)).toBe(
      'Suspended and deleting accounts are held automatically. 1 address that hard-bounced is suppressed by the mail provider and doesn’t appear here.',
    );
    expect(heldNote(null)).toBe(
      'Suspended and deleting accounts are held automatically. Addresses that hard-bounced are suppressed by the mail provider and don’t appear here.',
    );
  });

  it('asks before holding and releasing', () => {
    expect(holdDialog('Bakery Launch Crew').heading).toBe('Hold Bakery Launch Crew?');
    expect(holdDialog('Bakery Launch Crew').confirm).toBe('Hold');
    const release = releaseDialog('Class of 2015 Reunion');
    expect(release.heading).toBe('Release the hold on Class of 2015 Reunion?');
    expect(release.description).toBe(
      'Members here start getting email again, by their own settings, from the next change. Nothing held back is sent late.',
    );
    expect([release.confirm, release.keep]).toEqual(['Release hold', 'Keep it held']);
  });

  it('says when the search finds nothing', () => {
    expect(holdSearchNotes('', 0)).toEqual([]);
    expect(holdSearchNotes('bake', 1)).toEqual([]);
    expect(holdSearchNotes(' zzz ', 0)).toEqual([
      'No active Popkin matches “zzz”. Wrapped-up and held Popkins aren’t listed.',
    ]);
  });
});
