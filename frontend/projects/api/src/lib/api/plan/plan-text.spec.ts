import { describe, expect, it } from 'vitest';
import { BurnDownView, StoryView } from '../../models/plan';
import {
  chipStatus,
  recapLine,
  badgeLabel,
  biggestEmpty,
  burnHeadline,
  cardOf,
  chartText,
  columnsOf,
  daysLeftLabel,
  dueLabel,
  forecastText,
  moveOf,
  sprintLine,
  storyLine,
  whoChipsOf,
} from './plan-text';

function story(title: string, column: StoryView['column'], points: number): StoryView {
  return {
    id: title,
    title,
    column,
    points,
    tag: 'Travel',
    owner: null,
    dueDate: null,
    commentCount: 0,
    addedByMembershipId: 'm-mara',
    canDelete: true,
    addedAt: '2026-08-30T09:00:00Z',
  };
}

describe('recapLine (L2-075 AC4)', () => {
  it.each([
    [12, 14, '12 of 14 stories done'],
    [0, 3, '0 of 3 stories done'],
    [1, 1, '1 of 1 story done'],
  ])('says %i of %i as "%s"', (done, made, line) => {
    expect(recapLine(done, made)).toBe(line);
  });
});

describe('chipStatus (L2-068 AC7)', () => {
  it.each([
    [7, '7 behind'],
    [-3, '3 ahead'],
    [0, 'on track'],
  ])('says %i as "%s"', (behind, status) => {
    expect(chipStatus(behind)).toBe(status);
  });
});

describe('sprintLine', () => {
  it('names the sprint and its dates (L2-068 AC2)', () => {
    const sprint = {
      name: 'Planning sprint',
      firstDay: '2026-08-30',
      lastDay: '2026-09-26',
      daysLeft: 14,
    };
    expect(sprintLine(sprint)).toBe('Planning sprint · Aug 30 – Sep 26 · ');
  });

  it('names one month once when the sprint stays in it', () => {
    const sprint = {
      name: 'Planning sprint',
      firstDay: '2026-09-01',
      lastDay: '2026-09-28',
      daysLeft: 3,
    };
    expect(sprintLine(sprint)).toBe('Planning sprint · Sep 1 – 28 · ');
  });
});

describe('daysLeftLabel', () => {
  it.each([
    [14, '14 days left'],
    [1, '1 day left'],
    [0, '0 days left'],
  ])('%i reads "%s"', (days, label) => expect(daysLeftLabel(days)).toBe(label));
});

describe('dueLabel', () => {
  it('reads "Due {date}" (L2-068 AC4)', () => expect(dueLabel('2026-09-18')).toBe('Due Sep 18'));
});

describe('columnsOf', () => {
  it('gives the four columns in order with their counts and points (L2-068 AC3)', () => {
    const columns = columnsOf([
      story('Kayak', 'Backlog', 3),
      story('Van', 'ToDo', 5),
      story('Groceries', 'ToDo', 3),
      story('Cabin', 'Doing', 8),
    ]);

    expect(columns.map((c) => [c.heading, c.count, c.points])).toEqual([
      ['Backlog', 1, 3],
      ['To do', 2, 8],
      ['Doing', 1, 8],
      ['Done', 0, 0],
    ]);
    expect(columns[0].hint).toBe('Ideas, not this sprint');
    expect(columns[0].backlog).toBe(true);
    expect(columns[1].stories.map((s) => s.title)).toEqual(['Van', 'Groceries']);
  });
});

describe('cardOf', () => {
  it('names the owner by first name with their avatar (L2-068 AC4)', () => {
    const card = cardOf({
      ...story('Cabin', 'Doing', 8),
      owner: {
        membershipId: 'm-mara',
        firstName: 'Mara',
        avatar: { initials: 'MO', accent: 'Coral', photoUrl: null },
      },
      dueDate: '2026-09-18',
    });

    expect(card.owner).toEqual({ name: 'Mara', initials: 'MO', photo: null, accent: 'coral' });
    expect(card.due).toBe('Due Sep 18');
    expect(card.done).toBe(false);
  });

  it('shows no due date on a story that is done (L2-068 AC4, AC5)', () => {
    const card = cardOf({ ...story('Lake', 'Done', 3), dueDate: '2026-09-01' });

    expect(card.due).toBeNull();
    expect(card.done).toBe(true);
    expect(card.owner).toBeNull();
  });
});

describe('whoChipsOf', () => {
  it('offers every member by first name with their avatar (L2-069 AC1)', () => {
    const chips = whoChipsOf([
      {
        membershipId: 'm-mara',
        displayName: 'Mara Okafor',
        avatar: { initials: 'MO', accent: 'Coral', photoUrl: '/p/mara.jpg' },
        role: 'Host',
        isViewer: true,
      },
      {
        membershipId: 'm-sam',
        displayName: '  Sam   Ortega ',
        avatar: { initials: 'SO', accent: 'Amber', photoUrl: null },
        role: 'Member',
        isViewer: false,
      },
    ]);

    expect(chips).toEqual([
      { id: 'm-mara', name: 'Mara', initials: 'MO', photo: '/p/mara.jpg', accent: 'coral' },
      { id: 'm-sam', name: 'Sam', initials: 'SO', photo: null, accent: 'amber' },
    ]);
  });
});

describe('storyLine', () => {
  it('says where a story is, how big, who is on it and its tag (L2-070 AC1)', () => {
    const line = storyLine({
      ...story('Cabin', 'Doing', 8),
      tag: 'Stay',
      owner: {
        membershipId: 'm-mara',
        firstName: 'Mara',
        avatar: { initials: 'MO', accent: 'Coral', photoUrl: null },
      },
    });
    expect(line).toBe('Doing · 8 points · Mara · Stay');
  });

  it('says "To do", "1 point" and "No one yet"', () => {
    expect(storyLine(story('Licence', 'ToDo', 1))).toBe('To do · 1 point · No one yet · Travel');
  });
});

describe('moveOf', () => {
  it.each([
    ['Backlog', { to: 'ToDo', label: 'Move to To do' }],
    ['ToDo', { to: 'Doing', label: 'Move to Doing' }],
    ['Doing', null],
    ['Done', null],
  ] as const)('offers a %s story its next column, short of Done (L2-070 AC1)', (column, move) =>
    expect(moveOf(column)).toEqual(move),
  );
});

describe('the burn-down (L2-071)', () => {
  it('heads with the points left, or "All done" with none', () => {
    expect(burnHeadline(24)).toBe('24 pts left');
    expect(burnHeadline(1)).toBe('1 pt left');
    expect(burnHeadline(0)).toBe('All done');
  });

  it('badges how far behind or ahead, or on track (AC2)', () => {
    expect(badgeLabel(7)).toBe('7 behind');
    expect(badgeLabel(-3)).toBe('3 ahead');
    expect(badgeLabel(0)).toBe('On track');
  });

  it('says when the plan finishes (AC3)', () => {
    expect(forecastText({ kind: 'Late', date: '2026-09-30', days: 4 })).toBe(
      'Finishes Sep 30 · 4 days late',
    );
    expect(forecastText({ kind: 'Late', date: '2026-09-27', days: 1 })).toBe(
      'Finishes Sep 27 · 1 day late',
    );
    expect(forecastText({ kind: 'Early', date: '2026-09-17', days: 9 })).toBe(
      'Finishes Sep 17 · 9 days early',
    );
    expect(forecastText({ kind: 'LastDay', date: '2026-09-26', days: 0 })).toBe(
      'Finishes Sep 26, on the last day',
    );
    expect(forecastText({ kind: 'NoProgress', date: null, days: 0 })).toBe(
      'No progress in the last few days',
    );
    expect(forecastText({ kind: 'Done', date: '2026-09-17', days: 9 })).toBe(
      'Finished Sep 17 · 9 days early',
    );
    expect(forecastText({ kind: 'Done', date: '2026-09-28', days: -2 })).toBe(
      'Finished Sep 28 · 2 days late',
    );
    expect(forecastText({ kind: 'Done', date: '2026-09-26', days: 0 })).toBe('Finished Sep 26');
  });

  it('gives the chart as text: the status, the forecast and each day by its date (AC5)', () => {
    const view: BurnDownView = {
      sprint: {
        name: 'Planning sprint',
        firstDay: '2026-08-30',
        lastDay: '2026-09-26',
        daysLeft: 25,
      },
      startPoints: 32,
      pointsLeft: 24,
      behind: 7,
      forecast: { kind: 'Late', date: '2026-09-30', days: 4 },
      days: [
        { day: '2026-08-30', pointsLeft: 32 },
        { day: '2026-08-31', pointsLeft: 29 },
        { day: '2026-09-01', pointsLeft: 24 },
      ],
      biggest: [],
    };
    const days = 'Points left at the end of each day: Aug 30: 32, Aug 31: 29, Sep 1: 24.';

    expect(chartText(view)).toBe(`24 points left, 7 behind. Finishes Sep 30, 4 days late. ${days}`);
    expect(
      chartText({
        ...view,
        pointsLeft: 0,
        behind: -9,
        forecast: { kind: 'Done', date: '2026-09-17', days: 9 },
      }),
    ).toBe(`No points left, 9 ahead. Finished Sep 17, 9 days early. ${days}`);
    expect(
      chartText({ ...view, behind: 0, forecast: { kind: 'NoProgress', date: null, days: 0 } }),
    ).toBe(`24 points left, on track. No progress in the last few days. ${days}`);
  });

  it('says nothing is left open, to all of the members in words (AC6)', () => {
    expect(biggestEmpty(6)).toBe('Nothing left open. Nice work, all six of you.');
    expect(biggestEmpty(2)).toBe('Nothing left open. Nice work, both of you.');
    expect(biggestEmpty(1)).toBe('Nothing left open. Nice work.');
    expect(biggestEmpty(14)).toBe('Nothing left open. Nice work, all 14 of you.');
  });
});
