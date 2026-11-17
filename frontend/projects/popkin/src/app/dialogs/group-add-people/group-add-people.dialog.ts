import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  CONTACTS_API,
  ContactRowView,
  addPeopleLabel,
  addPeopleTitle,
  dayParam,
  matchesName,
} from 'api';
import { Alert, Button, DialogFrame, SearchField, TickList, TickListItem } from 'components';

export interface GroupAddPeopleData {
  /** The group to add to; none from New group, which only picks (L2-147 AC4). */
  groupId?: string;
  /** The group's name, as typed so far in New group. */
  name: string;
  /** Who is in it already: ticked, disabled and "In the group". */
  members: readonly string[];
}

/**
 * Add people (L2-147 AC3, AC4): my contacts to tick, the group's own first, ticked and
 * unavailable, then everyone else A to Z. "Add {n} people" is off with nobody new ticked. For a
 * group it adds them and closes with their ids; from New group it only closes with those ticked.
 */
@Component({
  selector: 'pk-group-add-people-dialog',
  imports: [Alert, Button, DialogFrame, SearchField, TickList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-add-people.dialog.html',
})
export class GroupAddPeopleDialog {
  private readonly data = inject<GroupAddPeopleData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ContactRowView[]>>(DialogRef);
  private readonly api = inject(CONTACTS_API);

  protected readonly title = addPeopleTitle(this.data.name);
  private readonly contacts = signal<ContactRowView[]>([]);
  protected readonly search = signal('');
  protected readonly ticked = signal<readonly string[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected readonly items = computed<TickListItem[]>(() => {
    const members = new Set(this.data.members);
    const search = this.search();
    const row = (c: ContactRowView, locked: boolean): TickListItem => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      photo: c.photoUrl,
      accent: c.accent.toLowerCase(),
      locked: locked ? 'In the group' : null,
    });
    const shown = this.contacts().filter((c) => matchesName(c.name, search));
    const inIt = this.data.members
      .map((id) => shown.find((c) => c.id === id))
      .filter((c): c is ContactRowView => !!c);
    return [
      ...inIt.map((c) => row(c, true)),
      ...shown.filter((c) => !members.has(c.id)).map((c) => row(c, false)),
    ];
  });

  protected readonly label = computed(() => addPeopleLabel(this.ticked().length));

  constructor() {
    this.api.people(dayParam(new Date())).subscribe((view) => this.contacts.set(view.contacts));
  }

  protected add(): void {
    if (this.busy() || !this.ticked().length) return;
    const ids = [...this.ticked()];
    const picked = ids
      .map((id) => this.contacts().find((c) => c.id === id))
      .filter((c): c is ContactRowView => !!c);
    if (!this.data.groupId) {
      this.ref.close(picked);
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api.addGroupPeople(this.data.groupId, ids).subscribe({
      next: () => this.ref.close(picked),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
