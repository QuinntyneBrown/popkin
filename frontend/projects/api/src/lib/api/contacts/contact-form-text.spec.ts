import { describe, expect, it } from 'vitest';
import { saveFailedHeading } from './contact-form-text';

describe('saveFailedHeading', () => {
  it('names the contact by the first word of the name typed (L2-129 AC6)', () => {
    expect(saveFailedHeading('  Femi Bankole ')).toBe('We couldn’t save Femi.');
  });
});
