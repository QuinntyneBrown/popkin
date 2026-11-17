import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  AddMemoryStore,
  AddedMemory,
  MEMORY_FILE_TYPES,
  MEMORY_PHOTO_TYPES,
  MemoryKind,
  possessive,
} from 'api';
import {
  Alert,
  Button,
  DialogFrame,
  FormSummary,
  MemoryChooser,
  MemoryUpload,
  SegmentedControl,
  TextField,
  Textarea,
} from 'components';

export interface AddMemoryData {
  contactId: string;
  firstName: string;
}

/**
 * Add to {first name}’s memories (docs/mocks/dialogs/add-memory, L2-136 AC2 to AC4, known gap
 * 107 ruled): a photo with an optional caption, a file or a note. It closes with what was kept,
 * which the profile places first.
 */
@Component({
  selector: 'pk-add-memory-dialog',
  imports: [
    Alert,
    Button,
    DialogFrame,
    FormSummary,
    MemoryChooser,
    MemoryUpload,
    ReactiveFormsModule,
    SegmentedControl,
    TextField,
    Textarea,
  ],
  providers: [AddMemoryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-memory.dialog.html',
})
export class AddMemoryDialog {
  private readonly ref = inject<DialogRef<AddedMemory>>(DialogRef);
  protected readonly data = inject<AddMemoryData>(DIALOG_DATA);
  protected readonly store = inject(AddMemoryStore);

  protected readonly heading = `Add to ${possessive(this.data.firstName)} memories`;
  protected readonly kinds = [
    { value: 'photo', label: 'Photo' },
    { value: 'file', label: 'File' },
    { value: 'note', label: 'Note' },
  ];
  protected readonly photoTypes = MEMORY_PHOTO_TYPES;
  protected readonly fileTypes = MEMORY_FILE_TYPES;
  protected readonly caption = new FormControl('', { nonNullable: true });
  protected readonly note = new FormControl('', { nonNullable: true });
  /** The chosen photo, drawn from the device. */
  protected readonly preview = signal<string | null>(null);

  protected readonly problems = computed(() =>
    this.store.problems().map(({ fieldId, message }) => ({ fieldId, message })),
  );
  protected readonly fileError = computed(() => this.error('file'));
  protected readonly chooseLabel = computed(() => {
    const kind = this.store.kind() === 'photo' ? 'photo' : 'file';
    return this.fileError() || this.store.file() ? `Choose another ${kind}` : `Choose a ${kind}`;
  });

  constructor() {
    this.caption.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.store.caption.set(v));
    this.note.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.store.note.set(v));
    inject(DestroyRef).onDestroy(() => this.drop());
  }

  protected error(fieldId: string): string | undefined {
    return this.store.problems().find((p) => p.fieldId === fieldId)?.error;
  }

  protected choose(kind: string): void {
    this.store.choose(kind as MemoryKind);
    this.drop();
  }

  protected pick(file: File): void {
    this.drop();
    this.store.pick(file);
    if (this.store.kind() === 'photo' && !this.fileError()) {
      this.preview.set(URL.createObjectURL(file));
    }
  }

  protected save(): void {
    this.store.save(this.data.contactId)?.subscribe({
      next: (added) => this.ref.close(added),
      error: () => undefined,
    });
  }

  private drop(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }
}
