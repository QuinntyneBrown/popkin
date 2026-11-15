import { expect, type Page } from '@playwright/test';
import { AddTimeOffDialog } from '../pages/add-time-off.dialog';
import { MyHoursDialog } from '../pages/my-hours.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { ThisWeekPage } from '../pages/this-week.page';
import { TimeOffPage } from '../pages/time-off.page';
import { openSetEvent, theMockEvent } from './event';
import type { RouteKey } from './routes';
import {
  maraThisWeek,
  maraWithASchedule,
  scheduleOf,
  theHomeWithNoEveningFree,
  theMockThisWeek,
  theMockTimeOff,
  theMocksHours,
  theMocksTimeOff,
  theThisWeekEmpty,
  theThisWeekFailing,
  theThisWeekLoading,
  theTimeOffConfirmed,
  theTimeOffEmpty,
  theTimeOffFailing,
  theTimeOffLoading,
} from './schedule';

/*
 * The states of the Schedule the mocks draw (journey 22), for the sweeps: `before` is the step
 * before the page opens, `app` what brings the open page to the state. Written and kept current;
 * only the repository owner runs the sweeps (ADR 0006).
 */

interface ScheduleState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

async function openAddTimeOff(page: Page): Promise<AddTimeOffDialog> {
  await new TimeOffPage(page).addMyTimeOff.click();
  const dialog = new AddTimeOffDialog(page);
  await expect(dialog.heading).toBeVisible();
  return dialog;
}

async function openMyHours(page: Page): Promise<MyHoursDialog> {
  await new ThisWeekPage(page).myHours.click();
  const dialog = new MyHoursDialog(page);
  await expect(dialog.heading).toBeVisible();
  return dialog;
}

export const scheduleStates = {
  timeOff: { before: theMockTimeOff },
  timeOffLoading: { before: theTimeOffLoading },
  timeOffEmpty: { before: theTimeOffEmpty },
  timeOffError: { before: theTimeOffFailing },
  timeOffConfirmed: { before: theTimeOffConfirmed },
  timeOffOtherWeek: { before: theMockTimeOff },
  timeOffOff: {
    before: async (page) => {
      const schedule = await maraWithASchedule(page, theMocksTimeOff);
      schedule.fail('off');
    },
  },
  addTimeOff: { before: theMockTimeOff, app: async (page) => void (await openAddTimeOff(page)) },
  addTimeOffBusy: {
    before: async (page) => {
      await theMockTimeOff(page);
      scheduleOf(page).holdSaves();
    },
    app: async (page) => (await openAddTimeOff(page)).save.click(),
  },
  addTimeOffInvalid: {
    before: theMockTimeOff,
    app: async (page) => void (await openAddTimeOff(page)),
  },
  addTimeOffFailed: {
    before: async (page) => {
      await theMockTimeOff(page);
      scheduleOf(page).failSaves();
    },
    app: async (page) => {
      const dialog = await openAddTimeOff(page);
      await dialog.save.click();
      await expect(dialog.alert).toBeVisible();
    },
  },
  thisWeek: { before: theMockThisWeek },
  thisWeekWorking: { before: theMockThisWeek },
  thisWeekEmpty: { before: theThisWeekEmpty },
  thisWeekLoading: { before: theThisWeekLoading },
  thisWeekError: { before: theThisWeekFailing },
  myHours: { before: theMockThisWeek, app: async (page) => void (await openMyHours(page)) },
  myHoursBusy: {
    before: async (page) => {
      await theMockThisWeek(page);
      scheduleOf(page).holdSaves();
    },
    app: async (page) => (await openMyHours(page)).save.click(),
  },
  myHoursInvalid: {
    before: theMockThisWeek,
    app: async (page) => {
      const dialog = await openMyHours(page);
      await dialog.field('Thursday', 'start').fill('09:00');
      await dialog.field('Thursday', 'end').fill('08:00');
    },
  },
  myHoursFailed: {
    before: async (page) => {
      await theMockThisWeek(page);
      scheduleOf(page).failSaves();
    },
    app: async (page) => {
      const dialog = await openMyHours(page);
      await dialog.save.click();
      await expect(dialog.alert).toBeVisible();
    },
  },
  popkinHomeSchedule: {
    before: async (page) => void (await maraThisWeek(page, theMocksHours)),
  },
  popkinHomeScheduleNone: { before: theHomeWithNoEveningFree },
  popkinSettingsSchedules: {
    before: async (page) => void (await theMockEvent(page)),
    app: async (page) => {
      await new PopkinHomePage(page).settings.click();
      await expect(new PopkinSettingsDialog(page).setEvent).toBeVisible();
    },
  },
  setEvent: {
    before: async (page) => void (await theMockEvent(page)),
    app: async (page) => void (await openSetEvent(page)),
  },
  setEventBusy: {
    before: async (page) => {
      const settings = await theMockEvent(page);
      settings.hold();
    },
    app: async (page) => (await openSetEvent(page)).save.click(),
  },
  setEventInvalid: {
    before: async (page) => void (await theMockEvent(page)),
    app: async (page) => (await openSetEvent(page)).lastDay.fill('2026-09-24'),
  },
  setEventFailed: {
    before: async (page) => {
      const settings = await theMockEvent(page);
      settings.fail();
    },
    app: async (page) => {
      const dialog = await openSetEvent(page);
      await dialog.save.click();
      await expect(dialog.alert).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, ScheduleState>>;
