import { describe, expect, it } from 'vitest';
import { encodeQr } from '../popkins/qr-encoder';
import { readQr } from './qr-pixels';

/** Draws a module matrix as RGBA pixels, `scale` pixels a module, with a quiet zone. */
function draw(modules: boolean[][], scale = 6, quiet = 4) {
  const size = (modules.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const at = (((r + quiet) * scale + y) * size + (c + quiet) * scale + x) * 4;
          data[at] = data[at + 1] = data[at + 2] = 0;
        }
      }
    }),
  );
  return { data, size };
}

describe('readQr', () => {
  it('reads the link a Popkin’s QR code carries', () => {
    const link = 'https://popkin.community/i/kx7m2pqr9t';
    const { data, size } = draw(encodeQr(link));
    expect(readQr(data, size, size)).toBe(link);
  });

  it('reads nothing where there is no code', () => {
    const data = new Uint8ClampedArray(120 * 120 * 4).fill(255);
    expect(readQr(data, 120, 120)).toBeNull();
  });
});
