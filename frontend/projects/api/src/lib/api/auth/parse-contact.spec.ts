import { describe, expect, it } from 'vitest';
import { parseContact } from './parse-contact';

describe('parseContact', () => {
  it.each([
    ['mara@hey.com', 'Email', 'mara@hey.com'],
    ['  Mara@Hey.com ', 'Email', 'Mara@Hey.com'],
    ['(555) 010-4477', 'Phone', '(555) 010-4477'],
    ['+1 555 010 4477', 'Phone', '+1 555 010 4477'],
  ])('reads %s as %s', (typed, channel, destination) => {
    expect(parseContact(typed)).toEqual({ channel, destination, error: null });
  });

  it.each([
    ['mara@hey', 'Email', 'That email doesn’t look quite right.'],
    ['@', 'Email', 'That email doesn’t look quite right.'],
    ['555 010', 'Phone', 'That number looks a digit short.'],
    ['mara', 'Phone', 'That number looks a digit short.'],
  ])('refuses %s with the message of sign up', (typed, channel, error) => {
    expect(parseContact(typed)).toMatchObject({ channel, error });
  });

  it('asks for something when nothing was typed', () => {
    expect(parseContact('   ').error).toBe('Enter your phone number or email.');
  });

  describe('with phone sign-in switched off (L2-084 AC4)', () => {
    it.each([
      ['mara@hey.com', 'mara@hey.com', null],
      ['(555) 010-4477', '(555) 010-4477', 'That email doesn’t look quite right.'],
      ['mara', 'mara', 'That email doesn’t look quite right.'],
    ])('reads %s as an email', (typed, destination, error) => {
      expect(parseContact(typed, ['Email'])).toEqual({ channel: 'Email', destination, error });
    });

    it('asks for an email when nothing was typed', () => {
      expect(parseContact('   ', ['Email'])).toEqual({
        channel: 'Email',
        destination: '',
        error: 'Enter your email.',
      });
    });
  });
});
