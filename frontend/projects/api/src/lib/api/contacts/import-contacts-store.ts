import { Injectable, computed, inject, signal } from '@angular/core';
import { ImportCandidatesView } from '../../models/import';
import { CONTACTS_API } from './contacts-api';

export type ImportState = 'loading' | 'ready' | 'failed' | 'importing' | 'importFailed';

/**
 * Import from your Popkins (docs/detailed-designs/contacts/import-from-popkins): the candidates,
 * one tick per person however many Popkins list them, and the import (L2-151). Everyone is ticked
 * at first. Provided by the dialog.
 */
@Injectable()
export class ImportContactsStore {
  private readonly api = inject(CONTACTS_API);
  private readonly clientId = crypto.randomUUID();

  readonly state = signal<ImportState>('loading');
  readonly candidates = signal<ImportCandidatesView | null>(null);
  readonly ticked = signal<ReadonlySet<string>>(new Set());

  /** Everyone offered, once each. */
  readonly everyone = computed<readonly string[]>(() => [
    ...new Set((this.candidates()?.popkins ?? []).flatMap((p) => p.people.map((x) => x.personId))),
  ]);
  /** How many distinct people are ticked: the n of "Import {n} people" (L2-151 AC2). */
  readonly count = computed(() => this.ticked().size);
  readonly nobody = computed(() => this.state() !== 'loading' && this.everyone().length === 0);

  /** Reads the candidates, everyone ticked (L2-151 AC1). */
  load(): void {
    this.state.set('loading');
    this.api.importCandidates().subscribe({
      next: (candidates) => {
        this.candidates.set(candidates);
        this.ticked.set(new Set(this.everyone()));
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }

  /** One person's tick, the same under every Popkin that lists them. */
  toggle(personId: string): void {
    this.ticked.update((ticked) => {
      const next = new Set(ticked);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  /** The ticks of one Popkin's list, as its checkboxes set them. */
  setTicks(personIds: readonly string[], ticked: readonly string[]): void {
    this.ticked.update((current) => {
      const next = new Set(current);
      for (const id of personIds) next.delete(id);
      for (const id of ticked) next.add(id);
      return next;
    });
  }

  /** "Tick nobody", then "Tick everyone" (L2-151 AC3, AC7). */
  tickAll(on: boolean): void {
    this.ticked.set(new Set(on ? this.everyone() : []));
  }

  /** "Import {n} people"; with nobody ticked nothing is sent. Answers how many were imported. */
  import(done: (imported: number) => void): void {
    if (this.count() === 0 || this.state() === 'importing') return;
    this.state.set('importing');
    this.api.importPeople({ clientId: this.clientId, personIds: [...this.ticked()] }).subscribe({
      next: (result) => {
        this.state.set('ready');
        done(result.imported);
      },
      error: () => this.state.set('importFailed'),
    });
  }
}
