import { AlbumFilter, PhotoSummaryView } from '../../models/photos';

/**
 * The album's words and its days, built from what the API answers. Days and times are read
 * on the device, as the member lives them.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

/** A photo as a cell of the grid. */
export interface AlbumPhotoView {
  id: string;
  src: string;
  /** What assistive technology reads (L2-032 AC7). */
  name: string;
  width: number;
  height: number;
  /** Twice the width and height of the others (L2-032 AC2). */
  feature: boolean;
}

export interface AlbumDayView {
  /** The day on the device, "2026-09-12": stable while pages are added. */
  key: string;
  label: string;
  photos: AlbumPhotoView[];
}

/** A thumbnail's name: its caption, or "Photo by {first name}" (L2-032 AC7). */
export function photoName(photo: Pick<PhotoSummaryView, 'caption' | 'uploader'>): string {
  return photo.caption || `Photo by ${photo.uploader.firstName}`;
}

/**
 * The photos under their days, in the order given (the API answers the latest first). Only
 * Everyone has a larger photo: the first of the latest day (L2-032 AC1 to AC3).
 */
export function groupPhotosByDay(
  items: readonly PhotoSummaryView[],
  now: Date,
  filter: AlbumFilter,
): AlbumDayView[] {
  const days: AlbumDayView[] = [];
  for (const item of items) {
    const taken = new Date(item.takenAt);
    const key = dayKey(taken);
    let day = days[days.length - 1];
    if (day?.key !== key) {
      day = { key, label: dayName(taken, now), photos: [] };
      days.push(day);
    }
    day.photos.push({
      id: item.id,
      src: item.thumbnailUrl,
      name: photoName(item),
      width: item.width,
      height: item.height,
      feature: filter === 'everyone' && days.length === 1 && day.photos.length === 0,
    });
  }
  return days;
}

/** "48 photos from 11 people" (L2-032 AC1), or that there are none yet. */
export function albumLine(photoCount: number, contributorCount: number): string {
  if (photoCount === 0) return 'No photos yet';
  const photos = `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`;
  return `${photos} from ${contributorCount} ${contributorCount === 1 ? 'person' : 'people'}`;
}

/** When a photo was added, under its author's name: "Saturday, 7:02 am" (L2-033 AC1). */
export function photoTime(at: Date, now: Date): string {
  const minutes = String(at.getMinutes()).padStart(2, '0');
  const time = `${at.getHours() % 12 || 12}:${minutes} ${at.getHours() < 12 ? 'am' : 'pm'}`;
  return `${dayName(at, now)}, ${time}`;
}

/** The weekday within the last week, then the date, with its year when it is another. */
function dayName(at: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY);
  if (days < 7) return WEEKDAYS[at.getDay()];
  const day = `${at.getDate()} ${MONTHS[at.getMonth()]}`;
  return at.getFullYear() === now.getFullYear() ? day : `${day} ${at.getFullYear()}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
}
