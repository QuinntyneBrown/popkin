import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import {
  FileMemoryView,
  MemoryKind,
  MemoryUploadEvent,
  NoteMemoryView,
  PhotoMemoryView,
} from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { tooLarge, uploadingStatus } from './memory-text';

/** A field's problem, with the summary's words and the field's own (L2-136 AC3). */
export interface MemoryProblem {
  fieldId: string;
  message: string;
  error: string;
}

/** What Add kept: the profile places it first. */
export type AddedMemory =
  | { kind: 'photo'; memory: PhotoMemoryView }
  | { kind: 'file'; memory: FileMemoryView }
  | { kind: 'note'; memory: NoteMemoryView };

const MAX_CAPTION = 200;
const MAX_NOTE = 2000;

function problem(fieldId: string, label: string, error: string): MemoryProblem {
  return { fieldId, message: `${label}: ${error.charAt(0).toLowerCase()}${error.slice(1)}`, error };
}

/** The words of each refusal the API answers with, by its code. */
const REFUSALS: Record<string, MemoryProblem> = {
  photo_type_not_allowed: {
    fieldId: 'file',
    message: 'Photo: choose a JPEG, PNG, WebP or HEIC image.',
    error: 'A photo must be a JPEG, PNG, WebP or HEIC image.',
  },
  file_type_not_allowed: problem(
    'file',
    'File',
    'Choose a PDF, a document, a spreadsheet or a picture.',
  ),
  caption_too_long: problem('caption', 'Caption', `Keep it to ${MAX_CAPTION} characters.`),
  note_too_long: problem('note', 'Note', 'Keep it to 2,000 characters.'),
  note_required: problem('note', 'Note', 'Write the note.'),
};

/**
 * Add to {first name}’s memories (docs/detailed-designs/contacts/memories): a photo with its
 * caption, a file or a note. A photo or file over 25 MB is refused as soon as it is chosen,
 * before any upload (L2-136 AC3); an upload reports how much is sent (AC4). A failure keeps
 * everything, and Save sends again under the same client id. Provided by the dialog.
 */
@Injectable()
export class AddMemoryStore {
  private readonly api = inject(CONTACTS_API);
  private clientId = crypto.randomUUID();

  readonly kind = signal<MemoryKind>('photo');
  readonly file = signal<File | null>(null);
  readonly caption = signal('');
  readonly note = signal('');
  readonly state = signal<'idle' | 'uploading' | 'saving' | 'failed'>('idle');
  readonly sent = signal(0);
  readonly total = signal(0);
  /** A field's problems show once Save is chosen; a file too large shows when it is chosen. */
  readonly submitted = signal(false);
  private readonly refused = signal<MemoryProblem | null>(null);

  readonly busy = computed(() => this.state() === 'uploading' || this.state() === 'saving');
  readonly status = computed(() => uploadingStatus(this.sent(), this.total()));
  readonly percent = computed(() =>
    this.total() ? Math.round((this.sent() / this.total()) * 100) : 0,
  );

  readonly problems = computed<MemoryProblem[]>(() => {
    const kind = this.kind();
    const file = this.file();
    const found: MemoryProblem[] = [];
    if (kind !== 'note' && file) {
      const large = tooLarge(kind, file.size);
      if (large) found.push({ fieldId: 'file', message: large.summary, error: large.error });
    }
    if (this.submitted()) {
      if (kind !== 'note' && !file) {
        found.push(
          problem('file', kind === 'photo' ? 'Photo' : 'File', `Choose a ${kind} to add.`),
        );
      }
      if (kind === 'photo' && this.caption().trim().length > MAX_CAPTION) {
        found.push(REFUSALS['caption_too_long']);
      }
      if (kind === 'note' && !this.note().trim()) found.push(REFUSALS['note_required']);
      if (kind === 'note' && this.note().trim().length > MAX_NOTE) {
        found.push(REFUSALS['note_too_long']);
      }
    }
    const refused = this.refused();
    return refused && !found.some((p) => p.fieldId === refused.fieldId)
      ? [...found, refused]
      : found;
  });

  /** "Photo", "File" or "Note": another kind starts a new memory. */
  choose(kind: MemoryKind): void {
    if (kind === this.kind() || this.busy()) return;
    this.kind.set(kind);
    this.file.set(null);
    this.submitted.set(false);
    this.refused.set(null);
    this.state.set('idle');
    this.clientId = crypto.randomUUID();
  }

  /** A photo or file chosen: another choice is a new memory. */
  pick(file: File): void {
    this.file.set(file);
    this.refused.set(null);
    this.state.set('idle');
    this.clientId = crypto.randomUUID();
  }

  /**
   * Save: nothing is sent while a field needs fixing. Answers the memory once kept; a refusal
   * shows at its field, any other failure as `failed`. `takenOn` dates a photo, as a
   * milestone's photo is dated by the milestone.
   */
  save(contactId: string, takenOn?: string): Observable<AddedMemory> | null {
    this.submitted.set(true);
    this.refused.set(null);
    if (this.problems().length > 0 || this.busy()) return null;
    const kind = this.kind();
    const file = this.file();
    let sent: Observable<AddedMemory>;
    if (kind === 'note' || !file) {
      this.state.set('saving');
      sent = this.api
        .addNoteMemory(contactId, this.clientId, this.note().trim())
        .pipe(map((memory): AddedMemory => ({ kind: 'note', memory })));
    } else {
      this.state.set('uploading');
      this.sent.set(0);
      this.total.set(file.size);
      const uploads: Observable<MemoryUploadEvent<PhotoMemoryView | FileMemoryView>> =
        kind === 'photo'
          ? this.api.addPhotoMemory(contactId, this.clientId, file, this.caption().trim(), takenOn)
          : this.api.addFileMemory(contactId, this.clientId, file);
      sent = new Observable<AddedMemory>((subscriber) =>
        uploads.subscribe({
          next: (event) => {
            if (event.kind === 'progress') {
              this.sent.set(event.sent);
              this.total.set(event.total);
            } else {
              subscriber.next({ kind, memory: event.memory } as AddedMemory);
              subscriber.complete();
            }
          },
          error: (error: unknown) => subscriber.error(error),
        }),
      );
    }
    return sent.pipe(
      tap({
        next: () => {
          this.state.set('idle');
          this.clientId = crypto.randomUUID();
        },
        error: (error: unknown) => {
          const code = error instanceof HttpErrorResponse ? error.error?.code : undefined;
          const refusal = typeof code === 'string' ? REFUSALS[code] : undefined;
          this.refused.set(refusal ?? null);
          this.state.set(refusal ? 'idle' : 'failed');
        },
      }),
    );
  }
}
