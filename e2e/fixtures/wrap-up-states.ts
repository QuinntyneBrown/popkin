import { expect, type Page } from '@playwright/test';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { RecapPage } from '../pages/recap.page';
import { WrapUpPage } from '../pages/wrap-up.page';
import { canoeId, theMockExperienceScreens } from './experiences';
import { type Home, maraAtHome, theMockHome } from './home';
import { maraInTheAlbum } from './photos';
import type { RouteKey } from './routes';
import {
  type WrapUp,
  photosRemoved,
  preparing,
  theMockRecap,
  theMockWrapUp,
  wrappedUp,
} from './wrap-up';

/*
 * The states of wrapping up the mocks draw, for the sweeps and the parity specs: `before` is
 * the step before the page opens, `app` what brings the open page to the state.
 */

/** The Monday after Lakeside Weekend wrapped up, when the mocks read what is left of it. */
const monday = new Date(2026, 8, 14, 9, 0);
/** Twelve days from that Monday: when the photos of the album that was not kept go. */
const inTwelveDays = new Date(2026, 8, 26, 8, 0).toISOString();

const asMember = (home: Home) => {
  home.popkin = { ...home.popkin, viewerRole: 'Member' };
};

const recapOf = (arrange?: (wrapUp: WrapUp) => void) => (page: Page) => theMockRecap(page, arrange);

/** A member who is not the Host reads the recap: the mocks' default. */
const member = (arrange?: (wrapUp: WrapUp) => void) =>
  recapOf((wrapUp) => {
    wrapUp.asMember();
    arrange?.(wrapUp);
  });

/** The album was not kept, and its photos have twelve days left. */
function going(home: Home): void {
  wrappedUp(home, false);
  home.popkin = { ...home.popkin, photosRemoveAt: inTwelveDays };
}

async function openSettings(page: Page): Promise<void> {
  await new PopkinHomePage(page).settings.click();
  await expect(new PopkinSettingsDialog(page).heading).toBeVisible();
}

/** The last hour of Lakeside Weekend, which wraps up on Sunday 13 September at 6 pm. */
const lastHour = (minute: number, second: number, change?: (home: Home) => void) => {
  return async (page: Page) => {
    await page.clock.install({ time: new Date(2026, 8, 13, 17, minute, second) });
    await maraAtHome(page, change);
  };
};

interface WrapUpState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const wrapUpStates = {
  popkinSettings: { before: (page) => theMockHome(page), app: openSettings },
  popkinSettingsMember: { before: (page) => theMockHome(page, asMember), app: openSettings },
  wrapUp: { before: (page) => theMockWrapUp(page) },
  wrapUpAlbumOff: {
    before: (page) => theMockWrapUp(page),
    app: async (page) => {
      const wrapUp = new WrapUpPage(page);
      await wrapUp.keepAlbum.click();
      await expect(wrapUp.keepAlbum).not.toBeChecked();
    },
  },
  wrapUpSubmitting: {
    before: (page) => theMockWrapUp(page, (wrapUp) => void wrapUp.hold('wrapUp')),
    app: async (page) => {
      const wrapUp = new WrapUpPage(page);
      await wrapUp.wrapItUp.click();
      await expect(wrapUp.wrapItUp).toBeDisabled();
    },
  },
  wrapUpError: {
    before: (page) => theMockWrapUp(page, (wrapUp) => wrapUp.break('wrapUp')),
    app: async (page) => {
      const wrapUp = new WrapUpPage(page);
      await wrapUp.wrapItUp.click();
      await expect(wrapUp.alert).toBeVisible();
    },
  },
  recap: { before: member() },
  recapHost: { before: recapOf() },
  recapLoading: { before: member((wrapUp) => void wrapUp.hold('recap')) },
  recapError: { before: member((wrapUp) => wrapUp.break('recap')) },
  recapExporting: {
    before: member((wrapUp) => {
      wrapUp.zip = [preparing(12)];
      wrapUp.hold('progress');
    }),
    app: async (page) => {
      const recap = new RecapPage(page);
      await recap.saveTheAlbum.click();
      await expect(recap.progressText).toHaveText('Preparing 12 of 48');
    },
  },
  recapPlain: {
    before: member((wrapUp) => {
      wrapUp.recap = { ...wrapUp.recap, photoCount: 0, photos: [], topRated: null };
    }),
  },
  recapGoing: {
    before: member((wrapUp) => {
      wrapUp.wrap(false);
      wrapUp.recap = { ...wrapUp.recap, photosRemoveAt: inTwelveDays };
    }),
  },
  // "1 hour left." is said for the hour's first minute.
  popkinHomeLastHour: { before: lastHour(0, 10) },
  popkinHomeLastHourMember: { before: lastHour(17, 30, asMember) },
  groupChatReadOnly: { before: recapOf() },
  photoAlbumWrapped: {
    before: async (page) => {
      await page.clock.install({ time: monday });
      await maraInTheAlbum(page, (_, home) => wrappedUp(home));
    },
  },
  photoAlbumGoing: {
    before: async (page) => {
      await page.clock.install({ time: monday });
      await maraInTheAlbum(page, (_, home) => going(home));
    },
  },
  photoAlbumRemoved: {
    before: async (page) => {
      await page.clock.install({ time: monday });
      await maraInTheAlbum(page, (album, home) => {
        wrappedUp(home, false);
        photosRemoved(home);
        album.empty();
      });
    },
  },
  experiencesWrapped: {
    before: (page) =>
      theMockExperienceScreens(page, (all, home) => {
        all.wrappedUp = true;
        wrappedUp(home);
      }),
  },
  experienceDetailWrapped: {
    before: (page) =>
      theMockExperienceScreens(page, (all, home) => {
        all.wrappedUp = true;
        all.find(canoeId);
        wrappedUp(home);
      }),
  },
} satisfies Partial<Record<RouteKey, WrapUpState>>;
