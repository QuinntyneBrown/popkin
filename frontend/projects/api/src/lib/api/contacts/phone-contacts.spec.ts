import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserPhoneContacts, phoneContactOf } from './phone-contacts';

describe('phoneContactOf', () => {
  it.each([
    [
      { name: ['Femi Bankole'], tel: ['+44 7700 900631', '020 7946 0018'] },
      { name: 'Femi Bankole', phone: '+44 7700 900631' },
    ],
    [
      { name: ['Femi Bankole'], tel: [] },
      { name: 'Femi Bankole', phone: null },
    ],
    [
      { name: ['', 'Femi'], tel: ['  ', '07700 900123'] },
      { name: 'Femi', phone: '07700 900123' },
    ],
    [{ name: [], tel: ['07700 900123'] }, null],
    [undefined, null],
  ])('%j is %j (L2-179 AC2)', (entry, contact) => {
    expect(phoneContactOf(entry)).toEqual(contact);
  });
});

describe('BrowserPhoneContacts', () => {
  afterEach(() => {
    delete (navigator as { contacts?: unknown }).contacts;
  });

  const withPicker = (select: unknown) =>
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select } });

  it('is not available without the Contact Picker (L2-179 AC3)', async () => {
    const phone = new BrowserPhoneContacts();

    expect(phone.available).toBe(false);
    expect(await phone.pickOne()).toBeNull();
  });

  it('asks for one entry’s name and numbers', async () => {
    const select = vi.fn(async () => [{ name: ['Femi'], tel: ['07700 900123'] }]);
    withPicker(select);
    const phone = new BrowserPhoneContacts();

    expect(phone.available).toBe(true);
    expect(await phone.pickOne()).toEqual({ name: 'Femi', phone: '07700 900123' });
    expect(select).toHaveBeenCalledWith(['name', 'tel'], { multiple: false });
  });

  it('answers null when none is picked or the browser refuses (L2-179 AC4)', async () => {
    withPicker(vi.fn(async () => []));
    expect(await new BrowserPhoneContacts().pickOne()).toBeNull();

    withPicker(vi.fn(async () => Promise.reject(new Error('refused'))));
    expect(await new BrowserPhoneContacts().pickOne()).toBeNull();
  });
});
