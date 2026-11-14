import { expect, type Page } from '@playwright/test';
import { ChangeLengthDialog } from '../pages/change-length.dialog';
import { EditPopkinDialog } from '../pages/edit-popkin.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { homeNow } from './home';
import type { RouteKey } from './routes';
import { type Settings, maraWithSettings } from './settings';

/*
 * The states of Popkin settings the mocks draw (journey 16), for the sweeps and the parity
 * specs: `before` is the step before the page opens, `app` what brings the open page to the
 * state.
 */

/** Mara, the Host, at the home of the mocks, on the mocks' day. */
const atHome = (arrange?: (settings: Settings) => void) => async (page: Page) => {
  await page.clock.install({ time: homeNow });
  arrange?.(await maraWithSettings(page));
};

/** Opens "Edit name and look" from Popkin settings. */
export async function openEditPopkin(page: Page): Promise<EditPopkinDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).editLook.click();
  const edit = new EditPopkinDialog(page);
  await expect(edit.heading).toBeVisible();
  return edit;
}

/** Opens "Change how long it lasts" from Popkin settings. */
export async function openChangeLength(page: Page): Promise<ChangeLengthDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).changeLength.click();
  const dialog = new ChangeLengthDialog(page);
  await expect(dialog.heading).toBeVisible();
  return dialog;
}

interface SettingsState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const settingsStates = {
  editPopkin: { before: atHome(), app: async (page) => void (await openEditPopkin(page)) },
  editPopkinBusy: {
    before: atHome((settings) => void settings.hold('look')),
    app: async (page) => {
      const edit = await openEditPopkin(page);
      await edit.save.click();
      await expect(edit.save).toBeDisabled();
    },
  },
  editPopkinInvalid: {
    before: atHome(),
    app: async (page) => {
      const edit = await openEditPopkin(page);
      await edit.name.fill('');
      await expect(edit.nameError).toBeVisible();
    },
  },
  editPopkinFailed: {
    before: atHome((settings) => settings.fail('look')),
    app: async (page) => {
      const edit = await openEditPopkin(page);
      await edit.save.click();
      await expect(edit.alert).toBeVisible();
    },
  },
  changeLength: {
    before: atHome(),
    app: async (page) => void (await openChangeLength(page)),
  },
  changeLengthBusy: {
    before: atHome((settings) => void settings.hold('length')),
    app: async (page) => {
      const dialog = await openChangeLength(page);
      await dialog.save.click();
      await expect(dialog.save).toBeDisabled();
    },
  },
  changeLengthFailed: {
    before: atHome((settings) => settings.fail('length')),
    app: async (page) => {
      const dialog = await openChangeLength(page);
      await dialog.save.click();
      await expect(dialog.alert).toBeVisible();
    },
  },
} satisfies Partial<Record<RouteKey, SettingsState>>;
