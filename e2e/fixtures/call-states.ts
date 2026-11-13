import { expect, type Page } from '@playwright/test';
import { VideoCallPage } from '../pages/video-call.page';
import { type Call, callers, maraWithACall, theMocksCall } from './call';
import type { DeviceAnswer } from './call-device';
import { says } from './far-end';
import { homeNow } from './home';
import type { RouteKey } from './routes';

/*
 * The states of the call the mocks draw, for the sweeps and the parity specs: `before` is the
 * step before the page opens, `app` what brings the open page to the state.
 */

/** The mocks' moment, held still: the call has run 12:48 for as long as the page is looked at. */
async function at(page: Page, arrange?: (call: Call) => void, device?: DeviceAnswer) {
  await maraWithACall(page, arrange, device);
  // The date stands still; the timers that carry sound and picture go on.
  await page.clock.setFixedTime(homeNow);
}

/** Six on the call, Mara the fourth, as the mocks seat them. */
const six = (call: Call): void => {
  theMocksCall(call);
  call.maraAt = 3;
};
const two = (call: Call): void => {
  call.underWay = true;
  call.others = [callers.walt];
};

/** Everyone's picture has arrived and Walt is speaking, as the mocks draw him. */
async function waltSpeaks(page: Page, people: number): Promise<void> {
  const video = new VideoCallPage(page);
  await expect(video.names).toHaveCount(people);
  await expect(video.person('Walt').video).toBeVisible();
  await says(page, callers.walt.membershipId);
  await expect(video.speaking).toHaveCount(1);
}

interface CallState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

export const callStates = {
  videoCall: { before: (page) => at(page, six), app: (page) => waltSpeaks(page, 6) },
  videoCallTwo: { before: (page) => at(page, two), app: (page) => waltSpeaks(page, 2) },
  videoCallMuted: {
    before: (page) => at(page, six),
    app: async (page) => {
      await waltSpeaks(page, 6);
      await new VideoCallPage(page).mute.click();
    },
  },
  videoCallCameraOff: {
    before: (page) => at(page, six),
    app: async (page) => {
      await waltSpeaks(page, 6);
      await new VideoCallPage(page).camera.click();
    },
  },
  videoCallLoading: { before: (page) => at(page, undefined, 'asking') },
  videoCallEmpty: {
    before: (page) => at(page, (call) => (call.startedAgo = 12_000)),
    app: async (page) => {
      await expect(new VideoCallPage(page).names).toHaveCount(1);
    },
  },
  videoCallError: { before: (page) => at(page, undefined, 'denied') },
  /** The home with a call of six under way, which Mara is not on. */
  bannerInfo: {
    before: (page) =>
      at(page, (call) => {
        theMocksCall(call);
        call.others = [...call.others, callers.mara];
      }),
  },
} satisfies Partial<Record<RouteKey, CallState>>;
