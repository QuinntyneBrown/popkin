import type { Page } from '@playwright/test';
import { chidiProfile, contactsMorning, marasHabits } from '../../fixtures/contacts';
import { ContactProfilePage } from '../../pages/contact-profile.page';
import { NewHabitDialog } from '../../pages/new-habit.dialog';

/** Mara's habits on the mocks' morning, as Habits draws them. */
export async function habitsAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await marasHabits(page);
}

/** Chidi's profile on the mocks' morning, his habit on it. */
export async function chidiAsDrawn(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page);
}

/** Chidi's profile with no habit yet. */
export async function chidiWithoutHabit(page: Page): Promise<void> {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page, { habit: null });
}

/** New habit with Chidi, as the dialog mocks open it. */
export async function openNewHabit(page: Page): Promise<NewHabitDialog> {
  await new ContactProfilePage(page).makeHabit.click();
  const dialog = new NewHabitDialog(page);
  await dialog.heading.waitFor();
  return dialog;
}
