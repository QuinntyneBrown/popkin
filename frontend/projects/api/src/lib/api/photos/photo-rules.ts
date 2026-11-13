/**
 * What a member may add to the album, checked on the device before anything is sent
 * (L2-031). The server checks again, from the file's own bytes.
 */
import { photoProblem } from '../invites/profile-photo';

export const MAX_PHOTOS = 20;
export const CAPTION_MAX = 200;
/** The caption's count shows from here on (L2-031 AC3). */
export const CAPTION_COUNT_FROM = 180;

const MB = 1024 * 1024;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Why a chosen file will not be added, as its row says it; null when it will (L2-031 AC2). */
export function albumPhotoProblem(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  // The types and the size are a profile photo's too (L2-013 AC2).
  const problem = photoProblem(file);
  if (problem === 'type')
    return 'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.';
  if (problem === 'size') {
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
