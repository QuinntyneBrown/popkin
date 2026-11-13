import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { PhotoUploads, UploadItemView } from 'api';
import { Alert, Button, DialogFrame, Progress, UploadItem } from 'components';

export interface AddPhotosData {
  popkinId: string;
  accent: string;
  files: File[];
}

/** The types a browser can draw before the upload; a HEIC shows a blank thumbnail. */
const DRAWN = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * "Add photos" (L2-031): the photos the member chose, a caption for each, the upload one at a
 * time and what became of each. It closes itself when every photo is in the album; a photo
 * left behind keeps it open, with the reason.
 */
@Component({
  selector: 'pk-add-photos-dialog',
  imports: [Alert, Button, DialogFrame, Progress, UploadItem],
  providers: [PhotoUploads],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-photos.dialog.html',
})
export class AddPhotosDialog {
  protected readonly data = inject<AddPhotosData>(DIALOG_DATA);
  protected readonly uploads = inject(PhotoUploads);
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly previews = new Map<File, string>();

  protected readonly rows = computed(() =>
    this.uploads.items().map((item, index) => ({
      item,
      fieldId: `cap${index}`,
      alt: `Photo ${index + 1}`,
      src: this.previews.get(item.file) ?? null,
      state: rowState(item),
      status: rowStatus(item),
      retry:
        item.state === 'failed' && this.uploads.canRetry() ? ('Try again' as const) : undefined,
    })),
  );
  protected readonly percent = computed(() =>
    Math.round((this.uploads.progress()?.fraction ?? 0) * 100),
  );

  constructor() {
    for (const file of this.data.files) {
      if (DRAWN.includes(file.type)) this.previews.set(file, URL.createObjectURL(file));
    }
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.previews.values()) URL.revokeObjectURL(url);
    });
    this.uploads.choose(this.data.popkinId, this.data.files);
    // Every photo is in the album: nothing is left to say.
    effect(() => {
      if (this.uploads.allAdded()) this.ref.close();
    });
  }

  protected act(): void {
    if (this.uploads.phase() === 'choosing') this.uploads.add();
    else this.ref.close();
  }
}

function rowState(item: UploadItemView): 'ready' | 'uploading' | 'done' | 'failed' {
  if (item.state === 'waiting' || item.state === 'uploading') return 'uploading';
  if (item.state === 'done' || item.state === 'failed') return item.state;
  return 'ready';
}

function rowStatus(item: UploadItemView): string | undefined {
  if (item.state === 'waiting' || item.state === 'uploading') return 'Uploading';
  return item.state === 'done' ? 'Added' : undefined;
}
