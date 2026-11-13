import jsQR from 'jsqr';

/**
 * The text of the QR code in a picture, given as RGBA pixels; null when it holds none. The
 * picture is read on the device and goes nowhere.
 */
export function readQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data || null;
}
