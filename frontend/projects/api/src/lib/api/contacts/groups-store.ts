import { Injectable, computed, inject, signal } from '@angular/core';
import { GROUP_KINDS, GroupKindName, GroupView } from '../../models/groups';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { GROUP_KIND_HEADINGS } from './groups-text';

/** The groups of one kind, as the list heads them. */
export interface GroupsOfKind {
  kind: GroupKindName;
  heading: string;
  groups: GroupView[];
}

/**
 * Groups (docs/detailed-designs/contacts/groups): the person's groups by kind, the open one, and
 * a group made or added to (L2-146, L2-147). A kind with no group is left out. Provided by the page.
 */
@Injectable()
export class GroupsStore {
  private readonly api = inject(CONTACTS_API);

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly groups = signal<GroupView[]>([]);
  /** The id of the open group, from the address. */
  readonly openId = signal<string | null>(null);

  readonly empty = computed(() => this.state() === 'ready' && this.groups().length === 0);

  readonly byKind = computed<GroupsOfKind[]>(() =>
    GROUP_KINDS.map((kind) => ({
      kind,
      heading: GROUP_KIND_HEADINGS[kind],
      groups: this.groups().filter((g) => g.kind === kind),
    })).filter((k) => k.groups.length > 0),
  );

  /** The open group; an id that is not one of theirs opens none. */
  readonly open = computed(() => this.groups().find((g) => g.id === this.openId()) ?? null);

  /** Reads the groups for the device's day; read again, the list stays while it is read. */
  load(day: Date = new Date()): void {
    if (this.state() !== 'ready') this.state.set('loading');
    this.api.groups(dayParam(day)).subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }

  /** A group made in New group, or added to: it takes its place in the list. */
  saved(group: GroupView): void {
    this.groups.update((groups) =>
      groups.some((g) => g.id === group.id)
        ? groups.map((g) => (g.id === group.id ? group : g))
        : sortGroups([...groups, group]),
    );
  }
}

/** By kind in the list's order, then name, as the API lists them. */
function sortGroups(groups: GroupView[]): GroupView[] {
  return [...groups].sort(
    (a, b) =>
      GROUP_KINDS.indexOf(a.kind) - GROUP_KINDS.indexOf(b.kind) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
