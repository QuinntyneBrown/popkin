import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DraftStore } from './draft-store';

describe('DraftStore (L2-028 AC4)', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps what was typed in a thread for the session', () => {
    TestBed.inject(DraftStore).set('t', 'Back in five');

    TestBed.resetTestingModule();
    const later = TestBed.inject(DraftStore);

    expect(later.get('t')).toBe('Back in five');
    expect(later.get('u')).toBe('');
  });

  it('forgets a draft once it is emptied', () => {
    const drafts = TestBed.inject(DraftStore);
    drafts.set('t', 'Back in five');
    drafts.set('t', '');
    expect(drafts.get('t')).toBe('');
    expect(sessionStorage.getItem('popkin.drafts')).toBe('{}');
  });

  it('reads nothing from a store it cannot parse', () => {
    sessionStorage.setItem('popkin.drafts', 'not json');
    expect(TestBed.inject(DraftStore).get('t')).toBe('');
  });
});
