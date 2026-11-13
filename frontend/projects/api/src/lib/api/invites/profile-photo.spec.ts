import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, photoProblem, photoProblemText } from './profile-photo';

const file = (name: string, type: string, size = 1024) => ({ name, type, size });

describe('photoProblem', () => {
  it.each([
    ['me.jpg', 'image/jpeg'],
    ['me.png', 'image/png'],
    ['me.webp', 'image/webp'],
    ['me.heic', 'image/heic'],
    ['me.heif', 'image/heif'],
  ])('accepts %s (%s)', (name, type) => {
    expect(photoProblem(file(name, type))).toBeNull();
  });

  it.each(['IMG_0042.HEIC', 'me.heif', 'me.JPG', 'me.jpeg'])(
    'goes by the extension of %s when the device names no type',
    (name) => {
      expect(photoProblem(file(name, ''))).toBeNull();
    },
  );

  it.each([
    ['notes.pdf', 'application/pdf'],
    ['clip.gif', 'image/gif'],
    ['drawing.svg', 'image/svg+xml'],
    ['film.mp4', 'video/mp4'],
    ['noextension', ''],
  ])('refuses %s (%s) for its type', (name, type) => {
    expect(photoProblem(file(name, type))).toBe('type');
  });

  it('accepts a photo of exactly 10 MB and refuses one byte more', () => {
    expect(photoProblem(file('me.jpg', 'image/jpeg', MAX_PHOTO_BYTES))).toBeNull();
    expect(photoProblem(file('me.jpg', 'image/jpeg', MAX_PHOTO_BYTES + 1))).toBe('size');
  });

  it('names the type first when both are wrong', () => {
    expect(photoProblem(file('notes.pdf', 'application/pdf', MAX_PHOTO_BYTES + 1))).toBe('type');
  });
});

describe('photoProblemText', () => {
  it('says what a photo can be', () => {
    expect(photoProblemText('type')).toBe(
      'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.',
    );
  });

  it('says how large a photo can be', () => {
    expect(photoProblemText('size')).toBe('That photo is over 10 MB. Choose a smaller one.');
  });
});
