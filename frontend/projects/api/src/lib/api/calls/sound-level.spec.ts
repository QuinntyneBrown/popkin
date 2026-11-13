import { describe, expect, it } from 'vitest';
import { SPEAKING_HOLD_MS, SPEAKING_LEVEL, heardSpeaking, soundLevel } from './sound-level';

describe('soundLevel', () => {
  it('is zero for silence, which the browser gives as 128 throughout', () => {
    expect(soundLevel(new Uint8Array(64).fill(128))).toBe(0);
  });
  it('is one for the loudest square wave', () => {
    expect(soundLevel(Uint8Array.from({ length: 64 }, (_, at) => (at % 2 ? 255 : 1)))).toBeCloseTo(
      1,
      1,
    );
  });
  it('is zero for no samples', () => {
    expect(soundLevel(new Uint8Array(0))).toBe(0);
  });
});

describe('heardSpeaking', () => {
  it.each([
    ['a sound at the level of speech', SPEAKING_LEVEL, null, 1_000, 1_000],
    ['a quiet room', SPEAKING_LEVEL / 2, null, 1_000, null],
    ['the pause between two words', 0, 1_000, 1_000 + SPEAKING_HOLD_MS, 1_000],
    ['silence after the pause', 0, 1_000, 1_001 + SPEAKING_HOLD_MS, null],
    ['speech going on', 0.5, 1_000, 1_200, 1_200],
  ])('%s', (_, level, lastHeard, now, expected) => {
    expect(heardSpeaking(level, lastHeard, now)).toBe(expected);
  });
});
