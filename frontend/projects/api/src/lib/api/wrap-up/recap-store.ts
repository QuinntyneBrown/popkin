import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';
import { AvatarView } from '../../models/invite';
import { accentOf } from '../../models/popkin';
import { AlbumExportView, RecapView } from '../../models/recap';
import { toApiProblem } from '../problem';
import { RECAP_API } from './recap-api';
import {
  count,
  exportProgress,
  peopleLine,
  photosGo,
  ranDates,
  statLabel,
  topRatedBy,
} from './wrap-up-text';

const POLL_MS = 1000;

/** The recap as its screen shows it. */
export interface RecapScreen {
  name: string;
  emoji: string;
  accent: string;
  /** "Lakeside Weekend · Fri 11 – Sun 13 Sep". */
  line: string;
  photos: string[];
  avatars: AvatarView[];
  /** The people beyond the faces shown. */
  more: number;
  people: string;
  stats: { value: string; label: string }[];
  topRated: { experienceId: string; title: string; score: string; by: string } | null;
  isHost: boolean;
  /** There are photos to save. */
  canSave: boolean;
  photosGo: { lead: string; text: string } | null;
}

/**
 * The recap of one wrapped-up Popkin (docs/detailed-designs/wrap-up/recap) and the saving of
 * its album: the zip is prepared elsewhere, its progress is asked for each second, and it is
 * downloaded once ready. One per screen; the page provides it.
 */
@Injectable()
export class RecapStore {
  private readonly api = inject(RECAP_API);
  private popkinId = '';
  private reading?: Subscription;
  private preparing?: Subscription;
  private readonly recap = signal<RecapView | null>(null);
  private readonly zip = signal<AlbumExportView | null>(null);
  private readonly downloads = new Subject<string>();
  private readonly failures = new Subject<void>();

  /** `active` is a Popkin that has not wrapped up: its home is the place to be. */
  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found' | 'active'>('loading');
  readonly view = computed<RecapScreen | null>(() => {
    const recap = this.recap();
    if (!recap) return null;
    return {
      name: recap.name,
      emoji: recap.emoji,
      accent: accentOf(recap.colour),
      line: `${recap.name} · ${ranDates(recap.startedAt, recap.wrappedUpAt)}`,
      photos: recap.photos.map((photo) => photo.thumbnailUrl),
      avatars: recap.avatars,
      more: Math.max(0, recap.peopleCount - recap.avatars.length),
      people: peopleLine(recap.peopleCount),
      stats: [
        { value: count(recap.messageCount), label: statLabel('messages', recap.messageCount) },
        { value: count(recap.photoCount), label: statLabel('photos', recap.photoCount) },
      ],
      topRated: recap.topRated && {
        experienceId: recap.topRated.experienceId,
        title: recap.topRated.title,
        score: recap.topRated.average.toFixed(1),
        by: topRatedBy(recap.topRated.sharedBy.firstName),
      },
      isHost: recap.isHost,
      canSave: recap.photoCount > 0 && !recap.photosRemovedAt,
      photosGo: recap.photosRemovedAt ? null : photosGo(recap.photosRemoveAt, new Date()),
    };
  });
  /** The album's zip while it is prepared; null otherwise. */
  readonly saving = computed(() => {
    const zip = this.zip();
    return zip
      ? {
          label: exportProgress(zip.photosDone, zip.photosTotal),
          value: zip.photosDone,
          max: zip.photosTotal,
        }
      : null;
  });
  /** The address of the zip, once it is ready to download. */
  readonly download$ = this.downloads.asObservable();
  readonly exportFailed$ = this.failures.asObservable();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.reading?.unsubscribe();
      this.preparing?.unsubscribe();
    });
  }

  open(popkinId: string): void {
    this.popkinId = popkinId;
    this.recap.set(null);
    this.read();
  }

  retry(): void {
    this.read();
  }

  /** "Save the album" (L2-046 AC4). */
  saveAlbum(): void {
    if (this.zip()) return;
    this.preparing?.unsubscribe();
    this.preparing = this.api.startAlbumExport(this.popkinId).subscribe({
      next: (zip) => this.follow(zip),
      error: () => this.failed(),
    });
  }

  private follow(zip: AlbumExportView): void {
    if (zip.status === 'Ready' && zip.downloadUrl) {
      this.zip.set(null);
      this.downloads.next(zip.downloadUrl);
      return;
    }
    if (zip.status !== 'Preparing') return this.failed();
    this.zip.set(zip);
    this.preparing = timer(POLL_MS).subscribe(() => {
      this.preparing = this.api.getAlbumExport(this.popkinId, zip.id).subscribe({
        next: (next) => this.follow(next),
        error: () => this.failed(),
      });
    });
  }

  private failed(): void {
    this.zip.set(null);
    this.failures.next();
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.getRecap(this.popkinId).subscribe({
      next: (recap) => {
        this.recap.set(recap);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        this.state.set(
          problem.status === 404
            ? 'not-found'
            : problem.code === 'popkin_active'
              ? 'active'
              : 'error',
        );
      },
    });
  }
}
