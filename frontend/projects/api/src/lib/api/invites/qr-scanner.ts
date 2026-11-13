import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** The camera is showing, or a QR code in view was read. */
export type ScanEvent = { kind: 'started' } | { kind: 'text'; text: string };

/** Why the camera did not start: refused, absent, or broken. */
export type ScannerProblem = 'denied' | 'no-camera' | 'failed';

/**
 * Reads QR codes with the device's camera (L2-015 AC1). Subscribing asks for the camera and
 * shows it in the video; unsubscribing stops every track. It fails with a `ScannerProblem`.
 * Frames are decoded on the device and never sent anywhere.
 */
export interface QrScanner {
  start(video: HTMLVideoElement): Observable<ScanEvent>;
}

export const QR_SCANNER = new InjectionToken<QrScanner>('QrScanner');

/** The browser's own QR reader, where it has one. */
interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorClass = new (options: { formats: string[] }) => Detector;

const EVERY_MS = 200;
/** The longest side a frame is read at; a QR code held to a camera needs no more. */
const READ_AT = 640;

@Injectable()
export class BrowserQrScanner implements QrScanner {
  private readonly document = inject(DOCUMENT);

  start(video: HTMLVideoElement): Observable<ScanEvent> {
    return new Observable<ScanEvent>((subscriber) => {
      const view = this.document.defaultView;
      let stream: MediaStream | null = null;
      let timer: ReturnType<typeof setInterval> | undefined;
      let closed = false;
      let reading = false;

      const stop = (): void => {
        closed = true;
        clearInterval(timer);
        stream?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      };

      const run = async (): Promise<void> => {
        const devices = view?.navigator.mediaDevices;
        if (!devices?.getUserMedia) throw new DOMException('No camera', 'NotFoundError');
        stream = await devices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const read = await this.reader();
        if (closed) return;
        subscriber.next({ kind: 'started' });
        timer = setInterval(() => {
          if (reading || video.readyState < 2) return;
          reading = true;
          read(video)
            .then((text) => {
              if (text && !closed) subscriber.next({ kind: 'text', text });
            })
            .catch(() => undefined)
            .finally(() => (reading = false));
        }, EVERY_MS);
      };

      run().catch((error: unknown) => {
        stop();
        subscriber.error(problemOf(error));
      });
      return stop;
    });
  }

  /** The browser's detector where there is one; otherwise the frame's pixels are read here. */
  private async reader(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
    const view = this.document.defaultView as (Window & { BarcodeDetector?: DetectorClass }) | null;
    if (view?.BarcodeDetector) {
      const detector = new view.BarcodeDetector({ formats: ['qr_code'] });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    }
    const { readQr } = await import('./qr-pixels');
    const canvas = this.document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    return (video) => {
      if (!context || !video.videoWidth) return Promise.resolve(null);
      const scale = Math.min(1, READ_AT / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      return Promise.resolve(readQr(frame.data, frame.width, frame.height));
    };
  }
}

function problemOf(error: unknown): ScannerProblem {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-camera';
  return 'failed';
}
