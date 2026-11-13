import type { Page } from '@playwright/test';

/**
 * The microphone and camera of a call, stubbed in the page: no test uses a real device. The
 * stub answers the request for both (allowed, refused, or still being asked), gives a moving
 * picture and a sound a spec can raise and lower, as a voice does.
 */
/** `asking` never answers: the browser's question is still open. */
export type DeviceAnswer = 'allowed' | 'denied' | 'broken' | 'asking';

interface DeviceStub {
  answer: DeviceAnswer;
  asked: number;
  streams: MediaStream[];
  /** Sets how loud the microphone hears: 0 is silence. */
  volume: (level: number) => void;
}

declare global {
  interface Window {
    pkDevice: DeviceStub;
  }
}

/** Installs the stub before the app starts; `answer` is what asking for the devices gets. */
export async function aCallDevice(page: Page, answer: DeviceAnswer = 'allowed'): Promise<void> {
  await page.addInitScript((first: DeviceAnswer) => {
    let level = 0;
    const gains: GainNode[] = [];
    const stub: DeviceStub = {
      answer: first,
      asked: 0,
      streams: [],
      volume: (next) => {
        level = next;
        gains.forEach((gain) => (gain.gain.value = next));
      },
    };
    window.pkDevice = stub;

    const picture = (): MediaStreamTrack => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d');
      let tick = 0;
      // A stream carries a frame each time its canvas is painted.
      setInterval(() => {
        if (!context) return;
        context.fillStyle = tick++ % 2 ? '#2a4d45' : '#2b4e46';
        context.fillRect(0, 0, 320, 240);
      }, 100);
      return canvas.captureStream(10).getVideoTracks()[0];
    };
    const sound = (): MediaStreamTrack => {
      const audio = new AudioContext();
      void audio.resume();
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = level;
      gains.push(gain);
      const out = audio.createMediaStreamDestination();
      tone.connect(gain).connect(out);
      tone.start();
      return out.stream.getAudioTracks()[0];
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          stub.asked++;
          if (stub.answer === 'denied') {
            return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
          }
          if (stub.answer === 'broken') {
            return Promise.reject(new DOMException('Could not start', 'NotReadableError'));
          }
          if (stub.answer === 'asking') return new Promise<MediaStream>(() => undefined);
          const stream = new MediaStream([sound(), picture()]);
          stub.streams.push(stream);
          return Promise.resolve(stream);
        },
      },
    });
  }, answer);
}

/** The member allows the microphone and camera in the browser's settings. */
export async function allowTheDevices(page: Page): Promise<void> {
  await page.evaluate(() => (window.pkDevice.answer = 'allowed'));
}

/** The member says something, or stops. */
export async function speakUp(page: Page): Promise<void> {
  await page.evaluate(() => window.pkDevice.volume(0.8));
}

export async function goQuiet(page: Page): Promise<void> {
  await page.evaluate(() => window.pkDevice.volume(0));
}

/** How many times the app has asked for the microphone and camera. */
export function timesDevicesAsked(page: Page): Promise<number> {
  return page.evaluate(() => window.pkDevice.asked);
}

/** True once every track the app was given has been stopped: nothing is captured any more. */
export function devicesAreOff(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    window.pkDevice.streams.every((stream) =>
      stream.getTracks().every((track) => track.readyState === 'ended'),
    ),
  );
}

/** Whether the microphone, or the camera, of the call under way is sending. */
export function isSending(page: Page, kind: 'audio' | 'video'): Promise<boolean> {
  return page.evaluate((wanted) => {
    const stream = window.pkDevice.streams.at(-1);
    return !!stream?.getTracks().some((track) => track.kind === wanted && track.enabled);
  }, kind);
}
