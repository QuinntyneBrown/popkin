import {
  calendarPeople,
  holidaysPublishedToast,
  holidaysYearLine,
  publishHolidaysDialog,
  datesThrough,
  holidayDate,
  holidaysBannerHeading,
  holidaysBannerText,
  joinNames,
  lastEditedText,
  noDatesText,
  withoutNextYearLabel,
} from './holidays-text';

describe('holidays text (L2-196)', () => {
  it('joins one, two and three names', () => {
    expect(joinNames(['Islamic holidays'])).toBe('Islamic holidays');
    expect(joinNames(['Islamic holidays', 'Hindu festivals'])).toBe(
      'Islamic holidays and Hindu festivals',
    );
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('writes the banner with the names, the year and the people', () => {
    expect(holidaysBannerHeading(['Islamic holidays', 'Hindu festivals'], 2025)).toBe(
      'Islamic holidays and Hindu festivals have no dates after 31 Dec 2025.',
    );
    expect(holidaysBannerText(108770)).toBe(
      'From January, 108,770 people and their Popkins won’t see these holidays.',
    );
  });

  it('counts a calendar’s people, and nobody as "Nobody yet"', () => {
    expect(calendarPeople(412880)).toBe('412,880 people');
    expect(calendarPeople(1)).toBe('1 person');
    expect(calendarPeople(0)).toBe('Nobody yet');
  });

  it('reads "Dates through" or "Draft"', () => {
    expect(datesThrough({ draft: false, datesThrough: 2027 })).toBe('Dates through 2027');
    expect(datesThrough({ draft: true, datesThrough: null })).toBe('Draft');
  });

  it('reads the last edit with the admin’s name, or "Not yet"', () => {
    expect(lastEditedText({ at: '2026-01-14T10:00:00Z', adminName: 'Kwame' }, 'UTC')).toBe(
      '14 Jan · Kwame',
    );
    expect(lastEditedText(null)).toBe('Not yet');
  });

  it('writes a holiday’s date with its weekday', () => {
    expect(holidayDate('2026-02-18')).toBe('Wed 18 Feb');
  });

  it('says a year has no dates, and names the sidebar’s count', () => {
    expect(noDatesText(2027)).toBe('No 2027 dates yet.');
    expect(withoutNextYearLabel(2)).toBe('2 without next year’s dates');
  });

  const holiday = (status: 'ByRule' | 'Estimated' | 'Confirmed') => ({
    id: status,
    name: 'Eid',
    note: null,
    date: '2026-03-20',
    status,
  });
  const now = new Date('2026-07-14T12:00:00Z');

  it('reads a year not yet published with and without estimates (L2-197 AC2)', () => {
    const base = { year: 2026, publishedAt: null };
    expect(
      holidaysYearLine(
        { ...base, holidays: [holiday('Estimated'), holiday('Confirmed')], estimates: 1 },
        now,
        'UTC',
      ),
    ).toBe('1 of 2 dates are still estimates. Members see them as “expected”.');
    expect(
      holidaysYearLine({ ...base, holidays: [holiday('Confirmed')], estimates: 0 }, now, 'UTC'),
    ).toBe('All dates confirmed.');
    expect(holidaysYearLine({ ...base, holidays: [], estimates: 0 }, now, 'UTC')).toBeNull();
  });

  it('reads a live year (L2-197 AC4)', () => {
    expect(
      holidaysYearLine(
        {
          year: 2026,
          publishedAt: '2026-07-14T09:00:00Z',
          holidays: [holiday('Estimated')],
          estimates: 1,
        },
        now,
        'UTC',
      ),
    ).toBe(
      'Live since today. 1 of 1 dates are still estimates; members see them as “expected” until you confirm each one.',
    );
    expect(
      holidaysYearLine(
        {
          year: 2026,
          publishedAt: '2026-01-14T09:00:00Z',
          holidays: [holiday('ByRule')],
          estimates: 0,
        },
        now,
        'UTC',
      ),
    ).toBe('Every date follows a rule, so there is nothing to confirm. 2026 is live.');
    expect(
      holidaysYearLine(
        {
          year: 2026,
          publishedAt: '2026-01-14T09:00:00Z',
          holidays: [holiday('Confirmed')],
          estimates: 0,
        },
        now,
        'UTC',
      ),
    ).toBe('Live since 14 Jan.');
  });

  it('asks to publish with the dates, the Popkins and the estimates (L2-197 AC3)', () => {
    const text = publishHolidaysDialog({
      name: 'Islamic holidays',
      year: 2026,
      holidays: [holiday('Estimated'), holiday('Confirmed')],
      estimates: 1,
      popkins: 1340,
    });
    expect(text.heading).toBe('Publish Islamic holidays for 2026?');
    expect(text.description).toBe(
      '2 dates appear on the Important days of everyone using this calendar, and on 1,340 Popkins. 1 are estimates and show as “expected” until you confirm them.',
    );
    expect(text.confirm).toBe('Publish 2026');
  });

  it('says a year is live for its people and Popkins (L2-197 AC4)', () => {
    expect(
      holidaysPublishedToast({
        calendarName: 'Islamic holidays',
        year: 2026,
        people: 63950,
        popkins: 1340,
      }),
    ).toEqual(['Published', 'Islamic holidays 2026 is live for 63,950 people and 1,340 Popkins.']);
  });
});
