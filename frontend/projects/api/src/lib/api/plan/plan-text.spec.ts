import { describe, expect, it } from 'vitest';
import { StoryView } from '../../models/plan';
import {
  cardOf,
  columnsOf,
  daysLeftLabel,
  dueLabel,
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
