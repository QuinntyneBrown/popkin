import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FileMemoryView,
  MemoriesView,
  NoteMemoryView,
  PhotoMemoryView,
} from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';

const NONE: MemoriesView = { photos: [], files: [], notes: [] };

/**
 * A profile's "Memories & files" (L2-136 AC1): the contact's photos, files and notes, each newest
 * first, read when the tab opens; a memory just saved is placed first. Provided by the profile.
 */
@Injectable()
export class ContactMemoriesStore {
  private readonly api = inject(CONTACTS_API);
  private reading?: Subscription;
  private contactId = '';

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly memories = signal<MemoriesView>(NONE);
  readonly empty = computed(() => {
    const { photos, files, notes } = this.memories();
    return this.state() === 'ready' && photos.length + files.length + notes.length === 0;
  });

  open(contactId: string): void {
    this.contactId = contactId;
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.memories(contactId).subscribe({
      next: (memories) => {
        this.memories.set(memories);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }

  retry(): void {
    this.open(this.contactId);
  }

  /** A memory Add just saved, first among its kind. */
  added(kind: 'photo', memory: PhotoMemoryView): void;
  added(kind: 'file', memory: FileMemoryView): void;
  added(kind: 'note', memory: NoteMemoryView): void;
  added(
    kind: 'photo' | 'file' | 'note',
    memory: PhotoMemoryView | FileMemoryView | NoteMemoryView,
  ): void {
    const key = kind === 'photo' ? 'photos' : kind === 'file' ? 'files' : 'notes';
    this.memories.update((all) => ({
      ...all,
      [key]: [memory, ...all[key].filter((m) => m.id !== memory.id)],
    }));
  }
}
