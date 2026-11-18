import {
  calendarPeople,
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
});
