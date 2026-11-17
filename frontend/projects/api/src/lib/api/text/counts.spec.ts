import { describe, expect, it } from 'vitest';
import { counted, plural } from './counts';

describe('counts', () => {
  it('says one of a thing in the singular', () => {
    expect(counted(1, 'person', 'people')).toBe('1 person');
    expect(plural(1, 'story', 'stories')).toBe('story');
  });

  it('says none and many in the plural', () => {
    expect(counted(0, 'rating', 'ratings')).toBe('0 ratings');
    expect(counted(14, 'person', 'people')).toBe('14 people');
    expect(plural(2, 'is', 'are')).toBe('are');
  });

  it('adds an s where the plural is regular', () => {
    expect(counted(3, 'star')).toBe('3 stars');
    expect(plural(1, 'second')).toBe('second');
  });
});
