import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IMPORT_SHOWN,
  ImportContactsStore,
  ImportPopkinView,
  importLabel,
  importPeople,
  importingLabel,
} from 'api';
import {
  Alert,
  Button,
  DialogFrame,
  EmptyState,
  Link,
  Skeleton,
  TickGroup,
  TickListItem,
} from 'components';

/** A Popkin's section of Import: its people as tick-list items. */
interface ImportSection {
  popkin: ImportPopkinView;
  count: string;
  items: TickListItem[];
  ids: string[];
}

/**
 * Import from your Popkins (L2-151): everyone the person shares a Popkin with, under each Popkin,
 * all ticked, one tick per person. It closes with how many were imported; the opener opens People.
 */
@Component({
  selector: 'pk-import-contacts-dialog',
  imports: [Alert, Button, DialogFrame, EmptyState, Link, Skeleton, TickGroup],
  providers: [ImportContactsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-contacts.dialog.html',
})
export class ImportContactsDialog {
  protected readonly store = inject(ImportContactsStore);
  private readonly ref = inject<DialogRef<number>>(DialogRef);

  protected readonly shown = IMPORT_SHOWN;
  protected readonly skeletonRows = [1, 2, 3, 4];
  protected readonly busy = computed(() => this.store.state() === 'importing');
  protected readonly label = computed(() =>
    this.busy() ? importingLabel(this.store.count()) : importLabel(this.store.count()),
  );
  protected readonly sections = computed<ImportSection[]>(() =>
    (this.store.candidates()?.popkins ?? []).map((popkin) => ({
      popkin,
      count: importPeople(popkin.peopleCount),
      ids: popkin.people.map((p) => p.personId),
      items: popkin.people.map((p) => ({
        id: p.personId,
        name: p.name,
        initials: p.initials,
        photo: p.photoUrl,
        accent: p.accent.toLowerCase(),
      })),
    })),
  );

  constructor() {
    this.store.load();
  }

  protected ticksOf(section: ImportSection): string[] {
    const ticked = this.store.ticked();
    return section.ids.filter((id) => ticked.has(id));
  }

  protected import(): void {
    this.store.import((imported) => this.ref.close(imported));
  }

  protected close(): void {
    this.ref.close();
  }
}
