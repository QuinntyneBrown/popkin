import { RecentEntryView } from '../../models/today';
import {
  comingUpDays,
  driftingChip,
  driftingLine,
  lovesLine,
  overdueLine,
  readyToImportLine,
  recentTitle,
  recentWhen,
  spotlightSub,
  spotlightWhen,
  todayDue,
} from './today-text';

const entry = (over: Partial<RecentEntryView>): RecentEntryView => ({
  entryId: 'e',
  contactId: 'c',
  firstName: 'Ada',
  initials: 'AO',
  accent: 'Coral',
  photoUrl: null,
  kind: 'Conversation',
  channel: 'Phone',
  title: null,
  note: 'Knee is better.',
  day: '2026-09-13',
  daysAgo: 2,
  ...over,
});

describe('today-text', () => {
  it('reads the spotlight day as Today, Tomorrow, or the weekday and days left', () => {
    expect(spotlightWhen({ occursOn: '2026-09-15', daysLeft: 0 })).toBe('Today');
    expect(spotlightWhen({ occursOn: '2026-09-16', daysLeft: 1 })).toBe('Tomorrow');
    expect(spotlightWhen({ occursOn: '2026-09-19', daysLeft: 4 })).toBe('Saturday · in 4 days');
  });

  it('reads a Coming up row’s days', () => {
    expect(comingUpDays(0)).toBe('Today');
    expect(comingUpDays(1)).toBe('Tomorrow');
    expect(comingUpDays(11)).toBe('11 days');
  });

  it('joins the date’s line and Known as', () => {
    expect(spotlightSub('Turns 33', 'Best friend from uni')).toBe(
      'Turns 33 · Best friend from uni',
    );
    expect(spotlightSub(undefined, 'Best friend from uni')).toBe('Best friend from uni');
    expect(spotlightSub(undefined, null)).toBeUndefined();
  });

  it('lists what they love', () => {
    expect(lovesLine(['Pottery', 'natural wine', 'Sunday markets'])).toBe(
      'pottery, natural wine and Sunday markets.',
    );
    expect(lovesLine(['Pottery'])).toBe('pottery.');
    expect(lovesLine([])).toBeUndefined();
  });

  it('names a conversation by its channel and a milestone by its title', () => {
    expect(recentTitle(entry({}))).toBe('Ada · Phone');
    expect(recentTitle(entry({ channel: 'InPerson' }))).toBe('Ada · In person');
    expect(
      recentTitle(entry({ kind: 'Milestone', channel: null, title: 'Moved to Chapel Allerton' })),
    ).toBe('Ada · Moved to Chapel Allerton');
  });

  it('reads when an entry was: the weekday within 6 days, else the date', () => {
    expect(recentWhen({ day: '2026-09-15', daysAgo: 0 })).toBe('Today');
    expect(recentWhen({ day: '2026-09-13', daysAgo: 2 })).toBe('Sun');
    expect(recentWhen({ day: '2026-09-11', daysAgo: 4 })).toBe('Fri');
    expect(recentWhen({ day: '2026-09-07', daysAgo: 8 })).toBe('Sep 7');
  });

  it('says who has drifted', () => {
    expect(driftingLine([{ firstName: 'Sam' }, { firstName: 'Joel' }])).toBe(
      ' with Sam and Joel. Log a catch-up when you talk.',
    );
    expect(driftingLine([{ firstName: 'Sam' }])).toBe(' with Sam. Log a catch-up when you talk.');
    expect(driftingChip({ firstName: 'Sam', daysSince: 59 })).toBe('Sam · 59 days');
  });

  it('reads a follow-up’s due day, an overdue habit and the import count', () => {
    expect(todayDue('2 days late', true)).toBe('2 days late · You promised');
    expect(todayDue('Today', false)).toBe('Today');
    expect(overdueLine('Every 2 weeks', '2026-08-30')).toBe(
      'Every 2 weeks · the last one was Aug 30',
    );
    expect(readyToImportLine(23)).toBe(
      '23 people from your Popkins are ready to import. Only you can see your contacts.',
    );
    expect(readyToImportLine(1)).toBe(
      '1 person from your Popkins is ready to import. Only you can see your contacts.',
    );
  });
});
