import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';

/** Why the microphone and camera did not open: the member or the browser refused, or it broke. */
export type CallMediaProblem = 'denied' | 'failed';

/** The member's microphone and camera (L2-029 AC1). */
export interface CallMedia {
  /** Asks the browser for both. Rejects with a `CallMediaProblem`. */
  open(): Promise<MediaStream>;
}

export const CALL_MEDIA = new InjectionToken<CallMedia>('CallMedia');

@Injectable()
export class BrowserCallMedia implements CallMedia {
  private readonly view = inject(DOCUMENT).defaultView;

  async open(): Promise<MediaStream> {
    const devices = this.view?.navigator.mediaDevices;
    if (!devices?.getUserMedia) throw 'failed' satisfies CallMediaProblem;
    try {
      return await devices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      throw (
        name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed'
      ) satisfies CallMediaProblem;
    }
  }
}
