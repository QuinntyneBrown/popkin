// Acceptance Test
// Traces to: L2-072 AC11, L2-085 AC4
// Description: time off and this week follow what other members change without a reload: the
// hub's ScheduleChanged, a member who leaves, and a connection that comes back each read the
// open view again.
import { people, popkinId } from '../fixtures/chat';
import type { Hub } from '../fixtures/hub';
import { expect, test } from '../fixtures/pk-test';
import {
  type Schedule,
  maraThisWeek,
  maraWithASchedule,
  mocksWeek,
  theMocksHours,
  thisWeekDayUrl,
  timeOffUrl,
} from '../fixtures/schedule';
import { ThisWeekPage } from '../pages/this-week.page';
import { TimeOffPage } from '../pages/time-off.page';

/**
 * An open view reads itself again once the hub has connected (the shared real-time rules); a
 * change made only after that read proves the event, not the first read, brought it.
 */
async function caughtUp(reads: () => number, hub: Hub): Promise<void> {
  await hub.connected();
  await expect.poll(reads).toBeGreaterThanOrEqual(2);
}

test.describe('time off that changes while it is open', () => {
  let schedule: Schedule;
  let timeOff: TimeOffPage;

  test.beforeEach(async ({ page, hub }) => {
    schedule = await maraWithASchedule(page);
    await page.goto(timeOffUrl(mocksWeek));
    timeOff = new TimeOffPage(page);
    await expect(timeOff.cellsOf('Dev')).toHaveText([
      'Working',
      'Working',
      'Working',
      'Working',
      'Working',
      '',
      '',
    ]);
    await caughtUp(() => schedule.asked.length, hub);
  });

  // L2-072 AC11
  test('shows another member’s new time off when the schedule changes', async ({ hub }) => {
    schedule.off(people.dev.membershipId, ['2027-02-17']);

    await hub.push('ScheduleChanged', popkinId);

    await expect(timeOff.cellsOf('Dev')).toHaveText([
      'Working',
      'Working',
      'Off',
      'Working',
      'Working',
      '',
      '',
    ]);
  });

  // L2-085 AC4
  test('marks the event the Host has just set', async ({ hub }) => {
    schedule.event = { label: 'Cabin week', firstDay: '2027-02-15', lastDay: '2027-02-19' };

    await hub.push('ScheduleChanged', popkinId);

    await expect(timeOff.eventLabels).toHaveText(Array(5).fill('Cabin week'));
  });

  test('drops the row of a member who leaves', async ({ hub }) => {
    schedule.members = schedule.members.filter(
      (member) => member.membershipId !== people.dev.membershipId,
    );

    await hub.push('MemberLeft', popkinId, people.dev.membershipId);

    await expect(timeOff.names).not.toContainText(['Dev']);
  });

  test('reads the week again when the connection comes back', async ({ hub }) => {
    const before = schedule.asked.length;
    schedule.off(people.dev.membershipId, ['2027-02-17']);

    await hub.drop();
    await hub.connected();

    await expect.poll(() => schedule.asked.length).toBeGreaterThan(before);
    await expect(timeOff.cellsOf('Dev')).toHaveText([
      'Working',
      'Working',
      'Off',
      'Working',
      'Working',
      '',
      '',
    ]);
  });

  test('ignores a change of another Popkin', async ({ hub }) => {
    const before = schedule.asked.length;

    await hub.push('ScheduleChanged', '00000000-0000-4000-8000-000000000999');
    await hub.push('ScheduleChanged', popkinId);

    await expect.poll(() => schedule.asked.length).toBe(before + 1);
  });
});

test.describe('this week that changes while it is open', () => {
  // L2-072 AC11, for the hours of this week.
  test('shows another member’s new hours when the schedule changes', async ({ page, hub }) => {
    const schedule = await maraThisWeek(page, theMocksHours);
    await page.goto(thisWeekDayUrl('2026-09-17'));
    const thisWeek = new ThisWeekPage(page);
    await expect(thisWeek.blocksOf('Dev')).toHaveCount(0);
    await caughtUp(() => schedule.weeksFrom.length, hub);
    schedule.works(people.dev.membershipId, '2026-09-17', ['09:00', '19:00']);

    await hub.push('ScheduleChanged', popkinId);

    await expect(thisWeek.blocksOf('Dev')).toHaveText(['Working till 7 pm']);
  });
});
