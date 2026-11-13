import { describe, expect, it } from 'vitest';
import { PhotoSummaryView } from '../../models/photos';
import { albumLine, groupPhotosByDay, photoName, photoTime } from './album-days';

const now = new Date(2026, 8, 12, 12, 0); // Saturday

function photo(id: string, takenAt: Date, extra: Partial<PhotoSummaryView> = {}): PhotoSummaryView {
  return {
    id,
    caption: null,
    uploader: {
      membershipId: 'm-walt',
      firstName: 'Walt',
      avatar: { initials: 'WB', accent: 'Leaf', photoUrl: null },
    },
    takenAt: takenAt.toISOString(),
    addedAt: takenAt.toISOString(),
    thumbnailUrl: `/t/${id}.jpg`,
    width: 480,
    height: 320,
    isMine: false,
    ...extra,
  };
}

describe('photoName', () => {
  // L2-032 AC7
  it('is the caption', () => {
    expect(photoName(photo('a', now, { caption: 'Lunch on the lawn' }))).toBe('Lunch on the lawn');
  });

  it('is "Photo by {first name}" without one', () => {
    expect(photoName(photo('a', now))).toBe('Photo by Walt');
  });
});

describe('groupPhotosByDay', () => {
  const items = [
    photo('s2', new Date(2026, 8, 12, 9, 0)),
    photo('s1', new Date(2026, 8, 12, 7, 2)),
    photo('f1', new Date(2026, 8, 11, 23, 59)),
    photo('old', new Date(2026, 8, 1, 10, 0)),
    photo('older', new Date(2025, 11, 31, 10, 0)),
  ];

  // L2-032 AC1
  it('groups by the day on the device, in the order given', () => {
    const days = groupPhotosByDay(items, now, 'everyone');
    expect(days.map((day) => [day.label, day.photos.map((p) => p.id)])).toEqual([
      ['Saturday', ['s2', 's1']],
      ['Friday', ['f1']],
      ['1 Sep', ['old']],
      ['31 Dec 2025', ['older']],
    ]);
  });

  it('names a day a week back by its date, not its weekday', () => {
    const days = groupPhotosByDay([photo('w', new Date(2026, 8, 5, 10, 0))], now, 'everyone');
    expect(days[0].label).toBe('5 Sep');
  });

  // L2-032 AC2
  it('features the first photo of the latest day for Everyone', () => {
    const days = groupPhotosByDay(items, now, 'everyone');
    expect(days.flatMap((day) => day.photos.filter((p) => p.feature).map((p) => p.id))).toEqual([
      's2',
    ]);
  });

  // L2-032 AC3: the mock of Mine has no larger photo
  it('features none for Mine', () => {
    const days = groupPhotosByDay(items, now, 'mine');
    expect(days.flatMap((day) => day.photos).some((p) => p.feature)).toBe(false);
  });

  it('carries what a cell needs', () => {
    const [day] = groupPhotosByDay([photo('a', now, { caption: 'Dock' })], now, 'everyone');
    expect(day.photos[0]).toEqual({
      id: 'a',
      src: '/t/a.jpg',
      name: 'Dock',
      width: 480,
      height: 320,
      feature: true,
    });
  });

  it('is empty for no photos', () => {
    expect(groupPhotosByDay([], now, 'everyone')).toEqual([]);
  });
});

describe('albumLine', () => {
  it.each([
    [48, 11, '48 photos from 11 people'],
    [1, 1, '1 photo from 1 person'],
    [5, 1, '5 photos from 1 person'],
  ])('%i from %i reads "%s"', (photos, people, text) => {
    expect(albumLine(photos, people)).toBe(text);
  });
});

describe('photoTime', () => {
  it.each([
    [new Date(2026, 8, 12, 7, 2), 'Saturday, 7:02 am'],
    [new Date(2026, 8, 11, 19, 30), 'Friday, 7:30 pm'],
    [new Date(2026, 8, 12, 0, 5), 'Saturday, 12:05 am'],
    [new Date(2026, 8, 5, 12, 0), '5 Sep, 12:00 pm'],
    [new Date(2025, 11, 31, 9, 0), '31 Dec 2025, 9:00 am'],
  ])('%s reads "%s"', (at, text) => {
    expect(photoTime(at, now)).toBe(text);
  });
});
