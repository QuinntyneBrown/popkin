import qrcode from 'qrcode-generator';

/**
 * Encodes text as a QR code's module matrix (`true` is dark). Error correction H, so the mark
 * drawn over the centre still lets a phone camera read the link (L2-011 AC6).
 */
export function encodeQr(text: string): boolean[][] {
  const qr = qrcode(0, 'H');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, column) => qr.isDark(row, column)),
  );
}
