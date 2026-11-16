import { describe, expect, it } from 'vitest';
import {
  MAX_MEMORY_BYTES,
  fileLine,
  fileSize,
  noteLine,
  photoCaption,
  tooLarge,
  uploadingStatus,
} from './memory-text';

describe('Memories text (L2-136, known gap 107 ruled)', () => {
  const today = new Date(2026, 8, 15);
  const MB = 1024 * 1024;

  it('allows up to 25 MB', () => {
    expect(MAX_MEMORY_BYTES).toBe(25 * MB);
  });

  it.each([
    [25 * MB, null],
    [25 * MB + 1, 26],
    [32 * MB, 32],
    [31.2 * MB, 32],
  ])('a %d byte photo is too large: %s MB', (bytes, mb) => {
    const said = tooLarge('photo', bytes);
    if (mb === null) {
      expect(said).toBeNull();
    } else {
      expect(said).toEqual({
        summary: `Photo: that one is ${mb} MB; choose one up to 25 MB.`,
        error: `That photo is ${mb} MB. A photo can be up to 25 MB.`,
      });
    }
  });

  it('says the same of a file', () => {
    expect(tooLarge('file', 30 * MB)).toEqual({
      summary: 'File: that one is 30 MB; choose one up to 25 MB.',
      error: 'That file is 30 MB. A file can be up to 25 MB.',
    });
  });

  it('says how much is sent', () => {
    expect(uploadingStatus(2.4 * MB, 3.1 * MB)).toBe('Uploading · 2.4 of 3.1 MB');
    expect(uploadingStatus(0, 0.3 * MB)).toBe('Uploading · 0.0 of 0.3 MB');
  });

  it.each([
    [500, '1 KB'],
    [84 * 1024, '84 KB'],
    [1023 * 1024, '1023 KB'],
    [2.1 * MB, '2.1 MB'],
  ])('a file of %d bytes is %s', (bytes, size) => {
    expect(fileSize(bytes)).toBe(size);
  });

  it('lists a file by its month and size, a note by its day', () => {
    expect(fileLine({ addedOn: '2021-09-26', sizeBytes: 84 * 1024 })).toBe('Sep 2021 · 84 KB');
    expect(noteLine('2026-08-31', today)).toBe('Updated Aug 31');
    expect(noteLine('2025-08-31', today)).toBe('Updated Aug 31, 2025');
  });

  it('captions a photo with its day, or its day alone', () => {
    expect(photoCaption({ caption: 'Hot sauce night', day: '2026-08-08' }, today)).toBe(
      'Hot sauce night · Aug 8',
    );
    expect(photoCaption({ caption: 'Wedding day bonfire', day: '2021-09-26' }, today)).toBe(
      'Wedding day bonfire · Sep 26, 2021',
    );
    expect(photoCaption({ caption: null, day: '2026-08-08' }, today)).toBe('Aug 8');
  });
});
