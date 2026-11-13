import type { Page } from '@playwright/test';

/**
 * The camera of the Scan to join dialog, stubbed in the page: no test uses a real camera. The
 * stub answers the request for the camera (allowed, refused, or none on the device), plays a
 * blank picture, and reads as a QR code whatever text a spec holds up to it.
 */
export type CameraAnswer = 'allowed' | 'denied' | 'none';

interface CameraStub {
  answer: CameraAnswer;
  inView: string | null;
  asked: number;
  streams: MediaStream[];
}

declare global {
  interface Window {
    pkCamera: CameraStub;
  }
}

/** Installs the stub before the app starts; `answer` is what asking for the camera gets. */
export async function aCamera(page: Page, answer: CameraAnswer = 'allowed'): Promise<void> {
  await page.addInitScript((first: CameraAnswer) => {
    const stub: CameraStub = { answer: first, inView: null, asked: 0, streams: [] };
    window.pkCamera = stub;
    const picture = (): MediaStream => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 320;
      const context = canvas.getContext('2d');
      let tick = 0;
      // A stream carries a frame each time its canvas is painted.
      setInterval(() => {
        if (!context) return;
        context.fillStyle = tick++ % 2 ? '#222' : '#232323';
        context.fillRect(0, 0, 320, 320);
      }, 100);
      return canvas.captureStream(10);
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          stub.asked++;
          if (stub.answer === 'denied') {
            return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
          }
          if (stub.answer === 'none') {
            return Promise.reject(new DOMException('No camera', 'NotFoundError'));
          }
          const stream = picture();
          stub.streams.push(stream);
          return Promise.resolve(stream);
        },
      },
    });
    Object.defineProperty(window, 'BarcodeDetector', {
      configurable: true,
      value: class {
        detect(): Promise<{ rawValue: string }[]> {
          return Promise.resolve(stub.inView ? [{ rawValue: stub.inView }] : []);
        }
      },
    });
  }, answer);
}

/** Holds a QR code with this text up to the camera. */
export async function holdUp(page: Page, text: string): Promise<void> {
  await page.evaluate((shown) => (window.pkCamera.inView = shown), text);
}

/** The person changes their mind in the browser's settings: the next request is allowed. */
export async function allowTheCamera(page: Page): Promise<void> {
  await page.evaluate(() => (window.pkCamera.answer = 'allowed'));
}

/** True once every track of every stream the app was given has been stopped. */
export function cameraIsOff(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    window.pkCamera.streams.every((stream) =>
      stream.getTracks().every((track) => track.readyState === 'ended'),
    ),
  );
}

/** How many times the app has asked for the camera. */
export function timesAsked(page: Page): Promise<number> {
  return page.evaluate(() => window.pkCamera.asked);
}
