import { FileMemoryView, PhotoMemoryView } from '../../models/contacts';
import { parseDay } from './contact-dates-text';
import { timelineDay } from './log-entry-text';

const MB = 1024 * 1024;

/** The largest photo or file a memory keeps (L2-136 AC3). */
export const MAX_MEMORY_BYTES = 25 * MB;

/** The photos a memory takes, as the album's. */
export const MEMORY_PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic';

/** A PDF, a document, a spreadsheet, plain text or a picture (known gap 107, ruled). */
export const MEMORY_FILE_TYPES = `.pdf,.doc,.docx,.xls,.xlsx,.txt,${MEMORY_PHOTO_TYPES}`;

/**
 * "Photo: that one is 32 MB; choose one up to 25 MB." for the summary and "That photo is 32 MB. A
 * photo can be up to 25 MB." at the field; null when it fits. The size is rounded up, so a file
 * just over the limit never reads as 25 MB.
 */
export function tooLarge(
  kind: 'photo' | 'file',
  bytes: number,
): { summary: string; error: string } | null {
  if (bytes <= MAX_MEMORY_BYTES) return null;
  const mb = Math.ceil(bytes / MB);
  const word = kind === 'photo' ? 'Photo' : 'File';
  return {
    summary: `${word}: that one is ${mb} MB; choose one up to 25 MB.`,
    error: `That ${kind} is ${mb} MB. A ${kind} can be up to 25 MB.`,
  };
}

/** "Uploading · 2.4 of 3.1 MB" (L2-136 AC4). */
export function uploadingStatus(sent: number, total: number): string {
  return `Uploading · ${(sent / MB).toFixed(1)} of ${(total / MB).toFixed(1)} MB`;
}

/** "84 KB" under a megabyte, "2.1 MB" from one. */
export function fileSize(bytes: number): string {
  return bytes < MB
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / MB).toFixed(1)} MB`;
}

/** "Sep 2021 · 84 KB": the month a file was added, and its size (L2-136 AC1). */
export function fileLine(file: Pick<FileMemoryView, 'addedOn' | 'sizeBytes'>): string {
  const month = parseDay(file.addedOn).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  return `${month} · ${fileSize(file.sizeBytes)}`;
}

/** "Updated Aug 31" (L2-136 AC1). */
export function noteLine(updatedOn: string, today: Date): string {
  return `Updated ${timelineDay(updatedOn, today)}`;
}

/** "Hot sauce night · Aug 8": a photo's caption and day, or its day alone (L2-136 AC1). */
export function photoCaption(photo: Pick<PhotoMemoryView, 'caption' | 'day'>, today: Date): string {
  const day = timelineDay(photo.day, today);
  return photo.caption ? `${photo.caption} · ${day}` : day;
}
