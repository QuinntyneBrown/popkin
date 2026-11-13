import { describe, expect, it } from 'vitest';
import {
  CAPTION_MAX,
  MAX_PHOTOS,
  addLabel,
  captionCount,
  choosePhotos,
  photoProblem,
  uploadOutcome,
} from './photo-rules';

const MB = 1024 * 1024;
const file = (name: string, type: string, size = MB) => ({ name, type, size });

describe('photoProblem', () => {
  it.each([
    ['dock.jpg', 'image/jpeg'],
    ['dock.png', 'image/png'],
    ['dock.webp', 'image/webp'],
    ['dock.heic', 'image/heic'],
    ['dock.heif', 'image/heif'],
    // Some browsers give a HEIC file no type at all; its name says what it is.
    ['IMG_0042.HEIC', ''],
  ])('accepts %s (%s)', (name, type) => {
    expect(photoProblem(file(name, type))).toBeNull();
  });

  it.each([
    ['clip.mov', 'video/quicktime'],
    ['notes.pdf', 'application/pdf'],
    ['anim.gif', 'image/gif'],
    ['mystery', ''],
  ])('refuses %s (%s)', (name, type) => {
    expect(photoProblem(file(name, type))).toBe(
      'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.',
    );
  });

  it.each([
    [10 * MB, null],
    [10 * MB + 1, 'This file is 11 MB. Photos can be up to 10 MB.'],
    [14 * MB, 'This file is 14 MB. Photos can be up to 10 MB.'],
    [13.4 * MB, 'This file is 14 MB. Photos can be up to 10 MB.'],
  ])('a file of %d bytes: %s', (size, problem) => {
    expect(photoProblem(file('dock.jpg', 'image/jpeg', size))).toBe(problem);
  });
});

describe('choosePhotos', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => file(`${i}.jpg`, 'image/jpeg'));

  it('takes up to twenty', () => {
    expect(choosePhotos(many(20))).toEqual({ taken: many(20), message: null });
  });

  it('takes the first twenty of more and says so', () => {
    const chosen = choosePhotos(many(23));
    expect(chosen.taken).toHaveLength(MAX_PHOTOS);
    expect(chosen.taken[19].name).toBe('19.jpg');
    expect(chosen.message).toBe(
      'You can add 20 photos at a time. The first 20 are here; add the other 3 next.',
    );
  });

  it('counts one left over in the singular', () => {
    expect(choosePhotos(many(21)).message).toBe(
      'You can add 20 photos at a time. The first 20 are here; add the other one next.',
    );
  });
});

describe('addLabel', () => {
  it.each([
    [3, 'Add 3 photos'],
    [1, 'Add 1 photo'],
    [0, 'Add photos'],
  ])('%i reads "%s"', (n, label) => expect(addLabel(n)).toBe(label));
});

describe('captionCount', () => {
  it('shows nothing while the caption is short', () => {
    expect(captionCount('x'.repeat(179))).toBeNull();
  });

  it('counts from 180 characters', () => {
    expect(captionCount('x'.repeat(180))).toBe('180 / 200');
    expect(captionCount('x'.repeat(CAPTION_MAX))).toBe('200 / 200');
  });
});

describe('uploadOutcome', () => {
  it.each([
    [0, 3, null],
    [1, 2, 'One photo didn’t upload. The other two are in the album.'],
    [2, 1, 'Two photos didn’t upload. The other one is in the album.'],
    [3, 9, 'Three photos didn’t upload. The other nine are in the album.'],
    [1, 0, 'The photo didn’t upload.'],
    [3, 0, 'None of the photos uploaded.'],
    [2, 15, 'Two photos didn’t upload. The other 15 are in the album.'],
  ])('%i failed and %i added: %s', (failed, added, text) => {
    expect(uploadOutcome(failed, added)).toBe(text);
  });
});
