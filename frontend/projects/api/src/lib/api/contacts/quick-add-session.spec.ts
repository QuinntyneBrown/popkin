import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContactProfileView } from '../../models/contacts';
import { QuickAddSession } from './quick-add-session';

const femi = { id: 'femi', firstName: 'Femi' } as ContactProfileView;
const grace = { id: 'grace', firstName: 'Grace' } as ContactProfileView;

describe('QuickAddSession', () => {
  let session: QuickAddSession;

  beforeEach(() => {
    session = TestBed.inject(QuickAddSession);
  });

  it('counts a first save as one', () => {
    session.opened();
    session.added(femi);

    expect(session.count()).toBe(1);
  });

  it('counts on after Add another (L2-181 AC2)', () => {
    session.opened();
    session.added(femi);
    session.addAnother();
    session.opened();
    session.added(grace);

    expect(session.count()).toBe(2);
  });

  it('starts again at none when Quick Add opens without Add another', () => {
    session.opened();
    session.added(femi);
    session.opened();

    expect(session.count()).toBe(0);
  });

  it('answers the last one added only for their own id', () => {
    session.added(femi);

    expect(session.contact('femi')).toBe(femi);
    expect(session.contact('grace')).toBeNull();
  });
});
