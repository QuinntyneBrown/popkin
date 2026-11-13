/**
 * What a member may add to the album, checked on the device before anything is sent
 * (L2-031). The server checks again, from the file's own bytes.
 */
export const MAX_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const CAPTION_MAX = 200;
/** The caption's count shows from here on (L2-031 AC3). */
export const CAPTION_COUNT_FROM = 180;
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const NAMES = /\.(jpe?g|png|webp|heic|heif)$/i;
const MB = 1024 * 1024;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** The part of a `File` the rules read. */
export interface ChosenFile {
  name: string;
  type: string;
  size: number;
}

/** Why a chosen file will not be added, as its row says it; null when it will (L2-031 AC2). */
export function photoProblem(file: ChosenFile): string | null {
  // Some browsers give a HEIC file no type; then its name says what it is.
  const allowed = file.type ? TYPES.includes(file.type.toLowerCase()) : NAMES.test(file.name);
  if (!allowed) return 'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.';
  if (file.size > MAX_PHOTO_BYTES) {
    return `This file is ${Math.ceil(file.size / MB)} MB. Photos can be up to 10 MB.`;
  }
  return null;
}

/** The first twenty of what was chosen, and what to say about the rest (L2-031 AC1). */
export function choosePhotos<T>(files: readonly T[]): { taken: T[]; message: string | null } {
  if (files.length <= MAX_PHOTOS) return { taken: [...files], message: null };
  const rest = files.length - MAX_PHOTOS;
  return {
    taken: files.slice(0, MAX_PHOTOS),
    message: `You can add ${MAX_PHOTOS} photos at a time. The first ${MAX_PHOTOS} are here; add the other ${rest === 1 ? 'one' : rest} next.`,
  };
}

/** The dialog's action, counting the photos that will be sent: "Add 3 photos". */
export function addLabel(count: number): string {
  if (count <= 0) return 'Add photos';
  return `Add ${count} ${count === 1 ? 'photo' : 'photos'}`;
}

/** "184 / 200" once a caption nears its limit; null before. */
export function captionCount(caption: string): string | null {
  return caption.length >= CAPTION_COUNT_FROM ? `${caption.length} / ${CAPTION_MAX}` : null;
}

/** The alert over the rows once the uploads end; null when every photo went up (L2-031 AC5). */
export function uploadOutcome(failed: number, added: number): string | null {
  if (failed <= 0) return null;
  if (added <= 0) return failed === 1 ? 'The photo didn’t upload.' : 'None of the photos uploaded.';
  const lost = `${capital(word(failed))} ${failed === 1 ? 'photo' : 'photos'} didn’t upload.`;
  return `${lost} The other ${word(added)} ${added === 1 ? 'is' : 'are'} in the album.`;
}

function word(n: number): string {
  return WORDS[n] ?? String(n);
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
