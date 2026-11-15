import { describe, expect, it } from 'vitest';
import {
  changeRoleHeading,
  changeRoleSentence,
  lastActiveText,
  removeSentence,
} from './admin-role-text';

describe('lastActiveText', () => {
  const now = new Date('2026-07-14T12:00:00Z');

  it.each([
    ['2026-07-14T11:59:40Z', 'Now'],
    ['2026-07-14T11:46:00Z', '14 min ago'],
    ['2026-07-14T09:30:00Z', '2 hr ago'],
    ['2026-07-13T15:00:00Z', 'Yesterday'],
    ['2026-07-09T10:00:00Z', '9 Jul'],
  ])('writes %s as %s', (at, text) => {
    expect(lastActiveText(at, false, now, 'Europe/London')).toBe(text);
  });

  it('says an invited admin has not signed in yet', () => {
    expect(lastActiveText(null, true, now, 'Europe/London')).toBe('Invited · not signed in yet');
  });
});

describe('the role dialogs', () => {
  it.each([
    ['Viewer', 'Make Aiko Tanaka a Viewer?'],
    ['Owner', 'Make Aiko Tanaka an Owner?'],
  ] as const)('asks to make them %s', (role, heading) => {
    expect(changeRoleHeading('Aiko Tanaka', role)).toBe(heading);
  });

  it.each([
    ['Support', 'Viewer', /^Aiko can still look at everything but can no longer help people/],
    ['Viewer', 'Owner', /^Aiko can do everything/],
    ['Owner', 'Support', /^Aiko can still help people and Popkins but can no longer change admins/],
    ['Viewer', 'Support', /^Aiko can help people and Popkins/],
  ] as const)('says what %s to %s means', (from, to, sentence) => {
    expect(changeRoleSentence('Aiko Tanaka', from, to)).toMatch(sentence);
    expect(changeRoleSentence('Aiko Tanaka', from, to)).toMatch(
      /It applies the next time they open a page\.$/,
    );
  });

  it('names the role a removed admin had', () => {
    expect(removeSentence('Viewer')).toMatch(/They were a Viewer\.$/);
    expect(removeSentence('Owner')).toMatch(/They were an Owner\.$/);
  });
});
