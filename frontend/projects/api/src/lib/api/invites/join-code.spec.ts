import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InvitePreviewView } from '../../models/invite';
import { INVITES_API } from './invites-api';
import { JoinCode } from './join-code';

describe('JoinCode', () => {
  let answers: Subject<InvitePreviewView>[];
  let asked: string[];
  let join: JoinCode;

  const lookup = (code: string) => {
    asked.push(code);
    const answer = new Subject<InvitePreviewView>();
    answers.push(answer);
    return answer;
  };
  const answer = () => {
    answers.at(-1)?.next({} as InvitePreviewView);
    answers.at(-1)?.complete();
  };

  beforeEach(() => {
    answers = [];
    asked = [];
    TestBed.configureTestingModule({
      providers: [
        JoinCode,
        { provide: INVITES_API, useValue: { getPreview: lookup } },
        { provide: DOCUMENT, useValue: { location: { origin: 'https://popkin.community' } } },
      ],
    });
    join = TestBed.inject(JoinCode);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('looks up a code typed, in any case and with spaces around it', () => {
    join.find('  KX7M2PQR9T ');
    expect(join.state()).toBe('finding');
    expect(asked).toEqual(['kx7m2pqr9t']);

    answer();

    expect(join.state()).toBe('found');
    expect(join.code()).toBe('kx7m2pqr9t');
  });

  it('looks up the code of an invite link pasted, with or without its scheme', () => {
    join.find('https://popkin.community/i/kx7m2pqr9t');
    answer();
    join.find('popkin.community/i/kx7m2pqr9t');

    expect(asked).toEqual(['kx7m2pqr9t', 'kx7m2pqr9t']);
  });

  it('sends nothing more while it looks', () => {
    join.find('kx7m2pqr9t');
    join.find('kx7m2pqr9t');

    expect(asked).toHaveLength(1);
  });
});
