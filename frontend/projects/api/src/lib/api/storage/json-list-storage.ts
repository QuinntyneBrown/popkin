/**
 * A list kept as JSON under one key of the browser's local storage. Anything missing, unreadable
 * or not a list loads as empty; an empty list removes the key. A store that is absent, refused,
 * full or closed fails quietly, so the caller keeps its list in memory only.
 */
export class JsonListStorage<T> {
  constructor(
    private readonly document: Document,
    private readonly key: string,
  ) {}

  load(): T[] {
    try {
      const entries: unknown = JSON.parse(this.storage()?.getItem(this.key) ?? '[]');
      return Array.isArray(entries) ? (entries as T[]) : [];
    } catch {
      return [];
    }
  }

  save(entries: readonly T[]): void {
    try {
      if (entries.length === 0) this.storage()?.removeItem(this.key);
      else this.storage()?.setItem(this.key, JSON.stringify(entries));
    } catch {
      // A full or closed store keeps the list in memory only.
    }
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
