import { Injectable, computed, inject, signal } from '@angular/core';
import { ConnectionsView } from '../../models/connections';
import { SessionStore } from '../auth/session.store';
import { ConnectionFilter, connectionMapOf } from './connection-map';
import { CONTACTS_API } from './contacts-api';
import { mapLinks, panelRows, placeFaces } from './connections-view';

/** "You" in the middle of the map, as the mocks draw the person. */
const YOU_ACCENT = 'coral';

/**
 * Connections (docs/detailed-designs/contacts/connections): the map of my contacts and how they
 * know each other (L2-149). Choosing a face focuses it and choosing it again, or "Clear the
 * focus", shows everyone; the filter only hides lines. A connection made re-reads the map, so
 * its line shows (L2-150 AC4). Provided by the page.
 */
@Injectable()
export class ConnectionsStore {
  private readonly api = inject(CONTACTS_API);
  private readonly session = inject(SessionStore);

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly map = signal<ConnectionsView>({ people: [], connections: [] });
  readonly filter = signal<ConnectionFilter>('all');
  readonly focus = signal<string | null>(null);

  readonly empty = computed(() => this.state() === 'ready' && this.map().connections.length === 0);
  readonly youPhoto = computed(() => this.session.session()?.photoUrl ?? null);
  readonly youAccent = YOU_ACCENT;

  private readonly placed = computed(() => placeFaces(this.map().people.map((p) => p.contactId)));

  /** The faces as the map component draws them. */
  readonly people = computed(() => {
    const at = new Map(this.placed().map((p) => [p.id, p]));
    return this.map().people.map((p) => ({
      id: p.contactId,
      name: p.fullName,
      firstName: p.firstName,
      x: at.get(p.contactId)!.x,
      y: at.get(p.contactId)!.y,
      accent: p.accent.toLowerCase(),
      photo: p.photoUrl,
    }));
  });

  readonly view = computed(() =>
    connectionMapOf(this.placed(), mapLinks(this.map()), this.focus(), this.filter()),
  );

  /** The chosen face, for the panel. */
  readonly chosen = computed(
    () => this.map().people.find((p) => p.contactId === this.focus()) ?? null,
  );

  readonly rows = computed(() => {
    const chosen = this.chosen();
    return chosen
      ? panelRows(this.map(), chosen, { photoUrl: this.youPhoto(), accent: YOU_ACCENT })
      : [];
  });

  /** Reads the map; `focus` chooses a face from "See {first name}'s connections" (L2-149 AC8). */
  open(focus: string | null = null): void {
    this.state.set('loading');
    this.read(focus);
  }

  /** "Try again" after a failed read. */
  retry(): void {
    this.open(this.focus());
  }

  /** A face chosen: focus it, or let go when it is chosen again (L2-149 AC3). */
  choose(id: string | null): void {
    this.focus.set(id !== null && this.focus() === id ? null : id);
  }

  /** "Clear the focus". */
  clear(): void {
    this.focus.set(null);
  }

  /** A connection made in Connect: the map is read again, keeping the focus (L2-150 AC4). */
  connected(): void {
    this.read(this.focus());
  }

  private read(focus: string | null): void {
    this.api.connectionMap().subscribe({
      next: (map) => {
        this.map.set(map);
        this.focus.set(focus && map.people.some((p) => p.contactId === focus) ? focus : null);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }
}
