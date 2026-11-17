import { HabitRhythm } from '../../models/contacts';
import { habitDue, habitKeeping } from './habit-rules';

const day = (iso: string) => new Date(`${iso}T08:40:00`);

describe('habitDue', () => {
  it.each([
    ['2026-09-20', '2026-09-15', { state: 'ahead', late: 0 }],
    ['2026-09-15', '2026-09-15', { state: 'due', late: 0 }],
    ['2026-09-13', '2026-09-15', { state: 'overdue', late: 2 }],
    ['2026-02-28', '2026-03-01', { state: 'overdue', late: 1 }],
  ])('due %s, today %s', (dueOn, today, expected) => {
    expect(habitDue(dueOn, day(today))).toEqual(expected);
  });
});

// The design's keep strip table: K kept, · missed, D due; newest last.
describe('habitKeeping', () => {
  const cases: [string, HabitRhythm, string, string[], string, string, string, number, number][] = [
    [
      'weekly, eight drawn',
      'Weekly',
      '2026-08-01',
      ['2026-09-13', '2026-09-06', '2026-08-30'],
      '2026-09-20',
      '2026-09-15',
      '·····KKK',
      3,
      3,
    ],
    [
      'every 2 weeks, the latest due',
      'EveryTwoWeeks',
      '2026-01-01',
      ['2026-08-30', '2026-08-16'],
      '2026-09-13',
      '2026-09-15',
      '·········KKD',
      2,
      2,
    ],
    [
      'every 2 weeks, kept late',
      'EveryTwoWeeks',
      '2026-01-01',
      ['2026-09-15', '2026-08-30', '2026-08-16'],
      '2026-09-29',
      '2026-09-15',
      '········KK·K',
      3,
      1,
    ],
    [
      'monthly',
      'Monthly',
      '2026-01-01',
      ['2026-09-03'],
      '2026-10-03',
      '2026-09-15',
      '·········K',
      1,
      1,
    ],
    [
      'weekly, a week late',
      'Weekly',
      '2026-01-01',
      ['2026-09-01'],
      '2026-09-08',
      '2026-09-15',
      '·········K·D',
      1,
      0,
    ],
    ['weekly, new today', 'Weekly', '2026-09-15', [], '2026-09-22', '2026-09-15', 'D', 0, 0],
  ];

  it.each(cases)('%s', (_, rhythm, startedOn, kept, dueOn, today, strip, keptCount, run) => {
    const keeping = habitKeeping(
      { rhythm, startedOn, dueOn, kept: kept.map((on, i) => ({ id: `${i}`, on })) },
      day(today),
    );

    const drawn = keeping.periods
      .map((p) => (p === 'kept' ? 'K' : p === 'due' ? 'D' : '·'))
      .join('');
    expect(drawn).toBe(strip);
    expect(keeping.kept).toBe(keptCount);
    expect(keeping.run).toBe(run);
  });

  it('draws no period before the habit started', () => {
    const keeping = habitKeeping(
      {
        rhythm: 'Weekly',
        startedOn: '2026-08-01',
        dueOn: '2026-09-20',
        kept: [{ id: 'a', on: '2026-09-13' }],
      },
      day('2026-09-15'),
    );

    expect(keeping.periods).toHaveLength(8);
  });

  it('draws twelve at most', () => {
    const keeping = habitKeeping(
      { rhythm: 'Weekly', startedOn: '2025-01-01', dueOn: '2026-09-20', kept: [] },
      day('2026-09-15'),
    );

    expect(keeping.periods).toHaveLength(12);
    expect(keeping.periods.at(-1)).toBe('due');
  });

  it('runs on through a monthly habit whose day the month lacks', () => {
    const keeping = habitKeeping(
      {
        rhythm: 'Monthly',
        startedOn: '2025-12-31',
        dueOn: '2026-03-31',
        kept: [
          { id: 'a', on: '2026-02-28' },
          { id: 'b', on: '2026-01-31' },
        ],
      },
      day('2026-03-15'),
    );

    expect(keeping.periods.slice(-2)).toEqual(['kept', 'kept']);
    expect(keeping.run).toBe(2);
  });
});
