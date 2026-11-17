import { Signal, signal } from '@angular/core';

/** Where an outbox is kept on the device: `JsonListStorage` under its own key. */
export interface OutboxStore<E> {
  load(): E[];
  save(entries: E[]): void;
}

export interface OutboxQueueOptions<E> {
  storage: OutboxStore<E>;
  /** The id the device gave the write, which the API keeps it once by. */
  id: (entry: E) => string;
  /** The entry made to wait again: a reload finds a send that never got an answer. */
  waiting: (entry: E) => E;
  /** What is written down of an entry: an address made on this device means nothing later. */
  written?: (entry: E) => E;
}

/**
 * The state every outbox keeps (ADR 0029): its writes in order, written through to the device
 * at each change, a send a reload found under way put back to wait, and the files not yet
 * uploaded, in memory only. Each outbox decides when and how its writes are sent.
 */
export class OutboxQueue<E extends { state: string }> {
  private readonly held: ReturnType<typeof signal<E[]>>;
  private readonly files = new Map<string, File>();

  readonly entries: Signal<E[]>;

  constructor(private readonly options: OutboxQueueOptions<E>) {
    this.held = signal(
      options.storage
        .load()
        .map((entry) => (entry.state === 'Sending' ? options.waiting(entry) : entry)),
    );
    this.entries = this.held.asReadonly();
  }

  /** Keeps a write at the end of the queue, with the file it will upload. */
  add(entry: E, file?: File | null): void {
    if (file) this.files.set(this.options.id(entry), file);
    this.update((entries) => [...entries, entry]);
  }

  find(id: string): E | undefined {
    return this.held().find((entry) => this.options.id(entry) === id);
  }

  change(id: string, change: Partial<E>): void {
    this.update((entries) =>
      entries.map((entry) => (this.options.id(entry) === id ? { ...entry, ...change } : entry)),
    );
  }

  /** Drops the writes that match, and the files they held. */
  remove(match: (entry: E) => boolean): void {
    this.held()
      .filter(match)
      .forEach((entry) => this.files.delete(this.options.id(entry)));
    this.update((entries) => entries.filter((entry) => !match(entry)));
  }

  update(change: (entries: E[]) => E[]): void {
    this.held.update(change);
    const written = this.options.written;
    this.options.storage.save(written ? this.held().map(written) : this.held());
  }

  file(id: string): File | undefined {
    return this.files.get(id);
  }

  forgetFile(id: string): void {
    this.files.delete(id);
  }
}
