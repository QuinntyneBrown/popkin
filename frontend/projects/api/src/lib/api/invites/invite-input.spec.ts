import { describe, expect, it } from 'vitest';
import { parseInviteInput } from './invite-input';

const origin = 'https://popkin.community';

describe('parseInviteInput', () => {
  it.each([
    ['kx7m2pqr9t', 'kx7m2pqr9t'],
    ['  KX7M2PQR9T ', 'kx7m2pqr9t'],
    ['https://popkin.community/i/kx7m2pqr9t', 'kx7m2pqr9t'],
    ['https://popkin.community/i/kx7m2pqr9t/', 'kx7m2pqr9t'],
    ['https://popkin.community/i/kx7m2pqr9t?from=qr', 'kx7m2pqr9t'],
    ['popkin.community/i/kx7m2pqr9t', 'kx7m2pqr9t'],
    ['/i/kx7m2pqr9t', 'kx7m2pqr9t'],
  ])('finds the code in %s', (text, code) => {
    expect(parseInviteInput(text, origin)).toBe(code);
  });

  it.each([
    [''],
    ['https://example.com/i/kx7m2pqr9t'],
    ['https://popkin.community.example.com/i/kx7m2pqr9t'],
    ['https://popkin.community/p/kx7m2pqr9t'],
    ['https://popkin.community/i/kx7m2pqr9t/profile'],
    ['WIFI:S:Lakehouse;T:WPA;P:canoe;;'],
    ['short'],
    ['lakeside23'],
    ['kx7m2 pqr9t'],
    ['kx7m2!qr9t'],
    ['javascript:alert(1)'],
    ['a'.repeat(65)],
  ])('refuses %s', (text) => {
    expect(parseInviteInput(text, origin)).toBeNull();
  });
});
