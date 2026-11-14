import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
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
  const refuse = (status: number, body: object = {}) =>
    answers.at(-1)?.error(new HttpErrorResponse({ status, error: body }));
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

  // L2-015 AC6
  it('says a code that matches no Popkin is not found, and can be tried again', () => {
    join.find('kx7m2pqr9t');
    refuse(404, { code: 'invite_not_found' });

    expect(join.state()).toBe('not-found');

    join.find('kx7m2pqr9u');
    expect(join.state()).toBe('finding');
  });

  it('says text that holds no code is not found, without asking', () => {
    join.find('https://example.com/i/kx7m2pqr9t');
    expect(join.state()).toBe('not-found');
    join.find('not a code');
    expect(join.state()).toBe('not-found');
    expect(asked).toEqual([]);
  });

  it('asks for a code when nothing is typed, without asking the API', () => {
    join.find('   ');

    expect(join.state()).toBe('blank');
    expect(asked).toEqual([]);
  });

  it('takes the mark away when the text changes, but not while it looks', () => {
    join.find('');
    join.edit();
    expect(join.state()).toBe('idle');

    join.find('kx7m2pqr9t');
    join.edit();
    expect(join.state()).toBe('finding');
  });

  // L2-053 AC3, AC4
  it('says when to try again once too many codes are tried', () => {
    join.find('kx7m2pqr9t');
    refuse(429, { code: 'rate_limited', retryAfterSeconds: 540 });

    expect(join.state()).toBe('limited');
    expect(join.tryAgain()).toBe('Try again in 9 minutes.');
  });

  it('says a lookup that fails failed, and lets it be tried again', () => {
    join.find('kx7m2pqr9t');
    refuse(500, { code: 'server_error' });

    expect(join.state()).toBe('failed');

    join.find('kx7m2pqr9t');
    expect(asked).toHaveLength(2);
  });

  it('keeps the refusal shown while the text is changed', () => {
    join.find('kx7m2pqr9t');
    refuse(429, { code: 'rate_limited', retryAfterSeconds: 60 });

    join.edit();

    expect(join.state()).toBe('limited');
  });
});
