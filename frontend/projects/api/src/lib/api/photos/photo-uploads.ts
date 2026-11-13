import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { PhotoSummaryView } from '../../models/photos';
import {
  CAPTION_MAX,
  addLabel,
  captionCount,
  choosePhotos,
  albumPhotoProblem,
  uploadOutcome,
} from './photo-rules';
import { PHOTOS_API } from './photos-api';

export type UploadState = 'ready' | 'invalid' | 'waiting' | 'uploading' | 'done' | 'failed';

/** One chosen photo, as its row of the dialog shows it. */
export interface UploadItemView {
  id: number;
  file: File;
  /** "Caption for photo 2". */
  label: string;
  caption: string;
  /** "184 / 200" near the limit; null before. */
  count: string | null;
  state: UploadState;
  /** Why it will not be added, or that it did not upload. */
  problem: string | null;
}

interface Item {
  id: number;
  file: File;
  caption: string;
  state: UploadState;
  problem: string | null;
}

const REFUSED: Record<string, string> = {
  photo_type_not_allowed: 'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.',
  photo_too_large: 'This file is too large. Photos can be up to 10 MB.',
  caption_too_long: 'This caption is longer than 200 characters.',
};
const WRAPPED_UP = {
  heading: 'This Popkin has wrapped up.',
  text: 'Photos can’t be added to it any more.',
};

/**
 * The photos a member chose to add (docs/detailed-designs/photos/add-photos): which will go,
 * their captions, the uploads one at a time and what became of each. One per dialog.
 */
@Injectable()
export class PhotoUploads {
  private readonly api = inject(PHOTOS_API);

  private popkinId = '';
  private readonly list = signal<Item[]>([]);
  /** The run under way: how many it sends, how many have ended, and how far the current is. */
  private readonly run = signal({ total: 0, ended: 0, fraction: 0 });
  private readonly stopped = signal(false);

  readonly phase = signal<'choosing' | 'uploading' | 'finished'>('choosing');
  /** What to say when more than twenty were chosen. */
  readonly notice = signal<string | null>(null);
  /** The photos now in the album. */
  readonly added = signal<PhotoSummaryView[]>([]);

  readonly items = computed<UploadItemView[]>(() =>
    this.list().map((item, index) => ({
      ...item,
      label: `Caption for photo ${index + 1}`,
      count: captionCount(item.caption),
    })),
  );

  /** "Add 3 photos", then "Adding…", then "Done" (L2-031 AC1, AC4). */
  readonly action = computed(() => {
    if (this.phase() === 'uploading') return { label: 'Adding…', disabled: true };
    if (this.phase() === 'finished') return { label: 'Done', disabled: false };
    const ready = this.count('ready');
    return { label: addLabel(ready), disabled: ready === 0 };
  });

  /** "Uploading 2 of 3" and how far the whole run is; null when none is under way. */
  readonly progress = computed(() => {
    if (this.phase() !== 'uploading') return null;
    const { total, ended, fraction } = this.run();
    return {
      label: `Uploading ${Math.min(ended + 1, total)} of ${total}`,
      fraction: (ended + fraction) / total,
    };
  });

  /** The alert over the rows once a run ends with photos left behind (L2-031 AC5). */
  readonly outcome = computed(() => {
    if (this.phase() !== 'finished') return null;
    if (this.stopped()) return WRAPPED_UP;
    return uploadOutcome(this.count('failed'), this.added().length);
  });

  choose(popkinId: string, files: readonly File[]): void {
    this.popkinId = popkinId;
    const { taken, message } = choosePhotos(files);
    this.notice.set(message);
    this.list.set(
      taken.map((file, id) => {
        const problem = albumPhotoProblem(file);
        return { id, file, caption: '', state: problem ? 'invalid' : 'ready', problem };
      }),
    );
  }

  /** Sets a caption, keeping its first 200 characters (L2-031 AC3). */
  caption(id: number, text: string): void {
    this.change(
      id,
      (item) => ({ ...item, caption: text.slice(0, CAPTION_MAX) }),
      (item) => item.state === 'ready' || item.state === 'failed',
    );
  }

  /** Sends every photo that can go, one at a time. */
  add(): void {
    if (this.phase() !== 'choosing') return;
    this.begin((item) => item.state === 'ready');
  }

  /** Sends a photo that failed once more. */
  retry(id: number): void {
    if (this.phase() !== 'finished' || this.stopped()) return;
    this.begin((item) => item.id === id && item.state === 'failed');
  }

  private begin(chosen: (item: Item) => boolean): void {
    const total = this.list().filter(chosen).length;
    if (total === 0) return;
    this.list.update((items) =>
      items.map((item) => (chosen(item) ? { ...item, state: 'waiting', problem: null } : item)),
    );
    this.run.set({ total, ended: 0, fraction: 0 });
    this.phase.set('uploading');
    this.next();
  }

  private next(): void {
    const item = this.list().find((candidate) => candidate.state === 'waiting');
    if (!item) {
      this.phase.set('finished');
      return;
    }
    this.change(item.id, (it) => ({ ...it, state: 'uploading' }));
    this.api.upload(this.popkinId, item.file, item.caption.trim()).subscribe({
      next: (event) => {
        if (event.kind === 'progress') {
          this.run.update((run) => ({ ...run, fraction: event.fraction }));
          return;
        }
        this.added.update((photos) => [...photos, event.photo]);
        this.end(item.id, 'done', null);
      },
      error: (error: unknown) => {
        const code = codeOf(error);
        if (code === 'popkin_wrapped_up') {
          this.stop();
        } else if (code && REFUSED[code]) {
          this.end(item.id, 'invalid', REFUSED[code]);
        } else {
          this.end(item.id, 'failed', 'Didn’t upload.');
        }
      },
    });
  }

  private end(id: number, state: UploadState, problem: string | null): void {
    this.change(id, (item) => ({ ...item, state, problem }));
    this.run.update((run) => ({ ...run, ended: run.ended + 1, fraction: 0 }));
    this.next();
  }

  /** Nothing more can be added: what was on its way or waiting is left behind (L2-045 AC2). */
  private stop(): void {
    this.list.update((items) =>
      items.map((item) =>
        item.state === 'uploading' || item.state === 'waiting'
          ? { ...item, state: 'failed', problem: 'Didn’t upload.' }
          : item,
      ),
    );
    this.stopped.set(true);
    this.phase.set('finished');
  }

  private change(id: number, to: (item: Item) => Item, when: (item: Item) => boolean = () => true) {
    this.list.update((items) =>
      items.map((item) => (item.id === id && when(item) ? to(item) : item)),
    );
  }

  private count(state: UploadState): number {
    return this.list().filter((item) => item.state === state).length;
  }
}

function codeOf(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const code = (error.error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}
