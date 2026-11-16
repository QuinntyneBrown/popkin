import { describe, expect, it } from 'vitest';
import { editHeading, saveFailedHeading } from './contact-form-text';

describe('saveFailedHeading', () => {
  it('names the contact by the first word of the name typed (L2-129 AC6)', () => {
    expect(saveFailedHeading('  Femi Bankole ')).toBe('We couldn’t save Femi.');
  });
});

describe('editHeading', () => {
  it('names the contact by their first name (L2-130 AC1)', () => {
    expect(editHeading('Chidi')).toBe('Edit Chidi');
  });
});
