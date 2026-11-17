import { describe, expect, it } from 'vitest';
import { LONG_MONTHS, LONG_WEEKDAYS, SHORT_MONTHS, SHORT_WEEKDAYS } from './calendar';

describe('calendar names (docs/design-system/foundations/content.html)', () => {
  it('names the months as Date numbers them, from January at 0', () => {
    const march = new Date(2026, 2, 1).getMonth();

    expect(SHORT_MONTHS[march]).toBe('Mar');
    expect(LONG_MONTHS[march]).toBe('March');
    expect(SHORT_MONTHS).toHaveLength(12);
    expect(LONG_MONTHS.at(-1)).toBe('December');
  });

  it('names the weekdays as Date numbers them, from Sunday at 0', () => {
    const saturday = new Date(2026, 8, 12).getDay();

    expect(SHORT_WEEKDAYS[saturday]).toBe('Sat');
    expect(LONG_WEEKDAYS[saturday]).toBe('Saturday');
    expect(SHORT_WEEKDAYS[0]).toBe('Sun');
    expect(LONG_WEEKDAYS).toHaveLength(7);
  });
});
