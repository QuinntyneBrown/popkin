import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { people } from '../../../e2e/fixtures/chat';
import { maraWithAnEvent, openSetEvent } from '../../../e2e/fixtures/event';
import { homeOf, homeUrl } from '../../../e2e/fixtures/home';
import { test } from '../../../e2e/fixtures/pk-test';
import {
  maraThisWeek,
  maraWithASchedule,
  mocksWeek,
  theMocksHours,
  theMocksTimeOff,
  thisWeekDayUrl,
  timeOffUrl,
} from '../../../e2e/fixtures/schedule';
import { AddTimeOffDialog } from '../../../e2e/pages/add-time-off.dialog';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { MyHoursDialog } from '../../../e2e/pages/my-hours.dialog';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { ThisWeekPage } from '../../../e2e/pages/this-week.page';
import { TimeOffPage } from '../../../e2e/pages/time-off.page';
import path from 'node:path';
import { detail, frame, shot, shotsDir, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 22: journey 22, Find a free evening, in the running app. Mara opens
 * the Schedule of Cabin Week ’27: time off for the event's week, where she adds her own; this
 * week, where everyone is free on Wednesday from 7:30 pm, her hours, and "Plan dinner in chat";
 * the home's Schedule section, "Set the event" and the screen while Schedules is off. The answers
 * are those of `e2e/fixtures/schedule.ts` and `event.ts`; the hub is `e2e/fixtures/hub.ts`
 * (ADR 0005, ADR 0010); no backend and no database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/11-journey-22-find-a-free-evening` runs it.
 */

const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

/** Takes the pointer and the focus ring away, so a shot shows the state, not the hover. */
async function still(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

/** The event's week, everyone's time off in it but Mara's, who has not added hers yet. */
async function timeOffWithoutMara(page: Page, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await maraWithASchedule(page, (schedule) => {
    theMocksTimeOff(schedule);
    schedule.timeOff.delete(people.mara.membershipId);
  });
  await page.goto(timeOffUrl(mocksWeek));
  const timeOff = new TimeOffPage(page);
  await expect(timeOff.names).toHaveCount(6);
  await still(page);
  return timeOff;
}

/** Time off of the mocks: the event's week with everyone's time off. */
async function timeOff(page: Page, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await maraWithASchedule(page, theMocksTimeOff);
  await page.goto(timeOffUrl(mocksWeek));
  const view = new TimeOffPage(page);
  await expect(view.names).toHaveCount(6);
  await still(page);
  return view;
}

/** This week of the mocks, on a day. */
async function thisWeek(page: Page, size: Size, day = '2026-09-16', theme: Theme = 'light') {
  await frame(page, size, theme);
  await maraThisWeek(page, theMocksHours);
  await page.goto(thisWeekDayUrl(day));
  const view = new ThisWeekPage(page);
  await expect(view.days).toHaveCount(7);
  await expect(view.shifts).toBeVisible();
  await still(page);
  return view;
}

/** The legend's keys alone: the legend spans the table's width, its keys only its start. */
async function legendKeys(page: Page, view: TimeOffPage) {
  const keys = view.legend.locator(':scope > span');
  const first = (await keys.first().boundingBox())!;
  const last = (await keys.last().boundingBox())!;
  const pad = 12;
  await page.screenshot({
    path: path.join(shotsDir, 'legend.png'),
    animations: 'disabled',
    clip: {
      x: first.x - pad,
      y: Math.min(first.y, last.y) - pad,
      width: last.x + last.width - first.x + pad * 2,
      height: Math.max(first.height, last.height) + pad * 2,
    },
  });
}

test('time off at every size, and in the dark', async ({ page }) => {
  for (const size of SIZES) {
    await timeOff(page, size);
    await shot(page, `timeoff-${lower(size)}`);
  }
  const view = await timeOff(page, 'XL');
  await detail(view.table.locator('thead'), 'week-head', 12);
  await legendKeys(page, view);
  await timeOff(page, 'XS', 'dark');
  await shot(page, 'timeoff-xs-dark');
});

test('Mara adds her time off and the week fills in', async ({ page }) => {
  const view = await timeOffWithoutMara(page, 'L');
  await shot(page, 'before-l');
  await detail(view.rows.first(), 'mara-before', 12);
  await view.addMyTimeOff.click();
  const dialog = new AddTimeOffDialog(page);
  await expect(dialog.heading).toBeVisible();
  for (const day of ['Mon 15', 'Tue 16', 'Wed 17', 'Thu 18', 'Fri 19']) {
    await dialog.choice(day, 'Off').click();
  }
  await still(page);
  await shot(page, 'add-l');
  await detail(dialog.rows.first(), 'leave-row', 12);
  await dialog.save.click();
  await expect(dialog.root).toHaveCount(0);
  await expect(view.cellsOf('Mara').first()).toHaveText('Off');
  await still(page);
  await shot(page, 'after-l');
  await detail(view.rows.first(), 'mara-after', 12);

  await timeOffWithoutMara(page, 'XS');
  await new TimeOffPage(page).addMyTimeOff.click();
  await expect(new AddTimeOffDialog(page).heading).toBeVisible();
  await still(page);
  await shot(page, 'add-xs');
});

test('this week at every size, its parts, and an evening someone works', async ({ page }) => {
  for (const size of SIZES) {
    await thisWeek(page, size);
    await shot(page, `week-${lower(size)}`);
  }
  const view = await thisWeek(page, 'XL');
  await detail(view.dayPicker, 'days', 12);
  await detail(view.free, 'free', 12);
  await detail(view.shifts, 'shifts', 12);
  const working = await thisWeek(page, 'XL', '2026-09-15');
  await detail(working.free, 'ask', 12);
  await thisWeek(page, 'XS', '2026-09-15');
  await shot(page, 'working-xs');
});

test('My hours, and Plan dinner in chat', async ({ page }) => {
  const view = await thisWeek(page, 'XS');
  await view.myHours.click();
  const hours = new MyHoursDialog(page);
  await expect(hours.heading).toBeVisible();
  await still(page);
  await shot(page, 'hours-xs');

  const week = await thisWeek(page, 'XS');
  // The chat's header names the same Popkin as the Schedule.
  const held = homeOf(page).chat;
  held.thread = { ...held.thread, popkinName: 'Cabin Week ’27', emoji: '🛶', colour: 'Sky', memberCount: 6 };
  await week.chatAction.click();
  const chat = new GroupChatPage(page);
  await expect(chat.field).toHaveValue(/Everyone’s free Wednesday/);
  await still(page);
  await shot(page, 'draft-xs');
  await frame(page, 'XL');
  await still(page);
  await detail(chat.composer, 'draft', 12);
});

test('the home’s Schedule section, Set the event, and Schedules off', async ({ page }) => {
  await frame(page, 'XL');
  await maraThisWeek(page, theMocksHours);
  await page.goto(homeUrl);
  const home = new PopkinHomePage(page);
  await expect(home.scheduleLine).toBeVisible();
  await still(page);
  await shot(page, 'home-xl');
  await detail(home.schedule, 'home-card', 12);

  await frame(page, 'XS');
  await maraWithAnEvent(page, { label: 'Cabin week', firstDay: '2027-02-15', lastDay: '2027-02-19' });
  await page.goto(homeUrl);
  await openSetEvent(page);
  await still(page);
  await shot(page, 'event-xs');

  await frame(page, 'XS');
  // Switched off: the header says so too, so the tab is gone.
  const schedule = await maraWithASchedule(page, (held, home) => {
    theMocksTimeOff(held);
    home.popkin.schedules = false;
  });
  schedule.fail('off');
  await page.goto(timeOffUrl(mocksWeek));
  await expect(new TimeOffPage(page).off).toBeVisible();
  await still(page);
  await shot(page, 'off-xs');
});
