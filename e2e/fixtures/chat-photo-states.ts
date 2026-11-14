import type { Page } from '@playwright/test';
import { ChatPhotos } from '../pages/chat-photos';
import { theMockChat } from './chat';
import { aBigPhoto, aPhoto, theMockPhotos } from './photos';

/*
 * The states of journey 13, Photos in chat, the mocks draw, for the parity specs and the sweeps:
 * `before` is the step before the page opens (the answers of the API and the hub), `app` what
 * brings the open page to the state (picking a photo in the device's picker).
 */

interface ChatPhotoState {
  before: (page: Page) => Promise<void>;
  app?: (page: Page) => Promise<void>;
}

/** Dev's photo message in the mock thread. */
export const devsPhotoLine = 'Dock was glass this morning';

export const chatPhotoStates = {
  // Mara has chosen the photo of the bonfire, as the mock draws it: it waits above the field
  // (L2-026 AC1).
  groupChatPhotoPreview: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      const photos = new ChatPhotos(page);
      await photos.pick(aPhoto('bonfire.jpg'));
      await photos.preview.waitFor();
      await photos.previewImage.evaluate((image: HTMLImageElement) => image.decode());
    },
  },
  // A photo of 14 MB is refused, saying why, and nothing is previewed (L2-031 AC2).
  groupChatPhotoRefused: {
    before: (page) => theMockChat(page),
    app: async (page) => {
      const photos = new ChatPhotos(page);
      await photos.pick(aBigPhoto(14, 'lake.jpg'));
      await photos.refusal.waitFor();
    },
  },
  // The photo view of a photo sent in a direct message; until the app answers a direct
  // message's photo, an album photo stands in for it.
  photoViewDirect: { before: (page) => theMockPhotos(page) },
} satisfies Record<string, ChatPhotoState>;
