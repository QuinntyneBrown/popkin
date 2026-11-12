import type { Locator } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

/** Reads a QR code the way a phone camera does: from its pixels (L2-011 AC6). */
export async function scan(qr: Locator): Promise<string | null> {
  const png = PNG.sync.read(await qr.screenshot({ scale: 'device' }));
  // A quiet zone of white around the code, as it has on the card.
  const margin = 16;
  const width = png.width + margin * 2;
  const height = png.height + margin * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const from = (y * png.width + x) * 4;
      const to = ((y + margin) * width + x + margin) * 4;
      data.set(png.data.subarray(from, from + 4), to);
    }
  }
  return jsQR(data, width, height)?.data ?? null;
}
