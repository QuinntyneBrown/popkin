import { InjectionToken, Signal } from '@angular/core';

/** Who is speaking, heard on the device from each person's sound (L2-030 AC4). */
export interface SpeakingMeter {
  /** The membership ids of those speaking now. */
  readonly speaking: Signal<ReadonlySet<string>>;
  watch(membershipId: string, stream: MediaStream): void;
  unwatch(membershipId: string): void;
  clear(): void;
}

export const SPEAKING_METER = new InjectionToken<SpeakingMeter>('SpeakingMeter');
