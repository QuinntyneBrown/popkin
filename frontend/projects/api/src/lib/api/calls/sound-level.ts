/** How often each person's sound is measured. */
export const SPEAKING_SAMPLE_MS = 150;
/** The level, from 0 to 1, from which a sound counts as speech. */
export const SPEAKING_LEVEL = 0.04;
/** How long someone still counts as speaking after their last sound: the pause between words. */
export const SPEAKING_HOLD_MS = 600;

/** How loud a moment of sound is, from 0 to 1: the root mean square of the browser's samples. */
export function soundLevel(samples: Uint8Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    const value = (sample - 128) / 128;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * When someone was last heard speaking, given the level now and when they were heard before;
 * null once they have been quiet for longer than the pause between words.
 */
export function heardSpeaking(level: number, lastHeard: number | null, now: number): number | null {
  if (level >= SPEAKING_LEVEL) return now;
  return lastHeard !== null && now - lastHeard <= SPEAKING_HOLD_MS ? lastHeard : null;
}
