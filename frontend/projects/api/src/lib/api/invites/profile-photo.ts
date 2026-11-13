/**
 * What a profile photo may be (L2-013 AC2): a JPEG, PNG, WebP or HEIC image of at most 10 MB.
 * The API checks the bytes and has the last word; this refuses the plain cases before an upload.
 */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** The `accept` of the file input: the types, and the extensions for devices that name none. */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export type PhotoProblem = 'type' | 'size';

/** Why a chosen file cannot be a profile photo, or null when it can. */
export function photoProblem(file: {
  name: string;
  type: string;
  size: number;
}): PhotoProblem | null {
  // Some devices hand over a HEIC with no type at all; its name is then all there is to go by.
  const known = file.type ? TYPES.includes(file.type.toLowerCase()) : EXTENSIONS.test(file.name);
  if (!known) return 'type';
  return file.size > MAX_PHOTO_BYTES ? 'size' : null;
}

export function photoProblemText(problem: PhotoProblem): string {
  return problem === 'type'
    ? 'That file isn’t a photo we can use. Choose a JPEG, PNG, WebP or HEIC.'
    : 'That photo is over 10 MB. Choose a smaller one.';
}
