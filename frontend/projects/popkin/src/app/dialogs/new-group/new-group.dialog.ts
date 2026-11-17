import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  CONTACTS_API,
  ContactRowView,
  GROUP_KINDS,
  GROUP_KIND_LABELS,
  GROUP_NAME_ERROR,
  GROUP_NAME_MAX,
  GROUP_NAME_SUMMARY,
  GROUP_NAME_TOO_LONG,
  GROUP_NOTE_MAX,
  GROUP_NOTE_TOO_LONG,
  GroupKindName,
  GroupView,
  takeOutLabel,
} from 'api';
import {
  Alert,
  Button,
  ChoiceChips,
  DialogFrame,
  FieldLabel,
  FormProblem,
  FormSummary,
  Icon,
  Link,
  PersonPick,
  TextField,
  Textarea,
} from 'components';
import {
  GroupAddPeopleData,
  GroupAddPeopleDialog,
} from '../group-add-people/group-add-people.dialog';

/**
 * New group (L2-147 AC1, AC2, AC4, AC5): its name, what kind ("Household" at first), who's in
 * and a note. A name is needed and kept to 40 characters, a note to 500; both are checked before
 * anything is sent. It closes with the group made.
 */
@Component({
  selector: 'pk-new-group-dialog',
  imports: [
    Alert,
    Button,
    ChoiceChips,
    DialogFrame,
    FieldLabel,
    FormSummary,
    Icon,
    Link,
    PersonPick,
    ReactiveFormsModule,
    TextField,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-group.dialog.html',
})
export class NewGroupDialog {
  private readonly ref = inject<DialogRef<GroupView>>(DialogRef);
  private readonly dialog = inject(Dialog);
  private readonly api = inject(CONTACTS_API);
  private readonly clientId = crypto.randomUUID();

  protected readonly kinds = GROUP_KINDS.map((k) => ({ value: k, label: GROUP_KIND_LABELS[k] }));
  protected readonly name = new FormControl('', { nonNullable: true });
  protected readonly note = new FormControl('', { nonNullable: true });
  private readonly nameValue = signal('');
  private readonly noteValue = signal('');
  protected readonly kind = signal<GroupKindName>('Household');
  protected readonly people = signal<ContactRowView[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly tried = signal(false);
  private readonly summary = viewChild(FormSummary);

  protected readonly problems = computed<FormProblem[]>(() => {
    if (!this.tried()) return [];
    const problems: FormProblem[] = [];
    const name = this.nameValue().trim();
    if (!name) problems.push({ fieldId: 'gname', message: GROUP_NAME_SUMMARY });
    else if (name.length > GROUP_NAME_MAX)
      problems.push({ fieldId: 'gname', message: `Name: ${GROUP_NAME_TOO_LONG.toLowerCase()}` });
    if (this.noteValue().trim().length > GROUP_NOTE_MAX)
      problems.push({ fieldId: 'gnote', message: `Note: ${GROUP_NOTE_TOO_LONG.toLowerCase()}` });
    return problems;
  });

  constructor() {
    this.name.valueChanges.subscribe((value) => this.nameValue.set(value));
    this.note.valueChanges.subscribe((value) => this.noteValue.set(value));
  }

  protected error(fieldId: string): string | undefined {
    if (!this.problems().some((p) => p.fieldId === fieldId)) return undefined;
    if (fieldId === 'gnote') return GROUP_NOTE_TOO_LONG;
    return this.nameValue().trim() ? GROUP_NAME_TOO_LONG : GROUP_NAME_ERROR;
  }

  protected takeOut(person: ContactRowView): string {
    return takeOutLabel(person.firstName);
  }

  protected remove(index: number): void {
    this.people.update((people) => people.filter((_, i) => i !== index));
  }

  /** "Add people": picks without saving; those ticked join "Who's in" (L2-147 AC4). */
  protected addPeople(): void {
    this.dialog
      .open<ContactRowView[], GroupAddPeopleData>(GroupAddPeopleDialog, {
        data: { name: this.name.value, members: this.people().map((p) => p.id) },
        ariaLabelledBy: 'add-people-title',
        hasBackdrop: false,
        ariaModal: true,
      })
      .closed.subscribe((picked) => {
        if (picked?.length) this.people.update((people) => [...people, ...picked]);
      });
  }

  protected make(): void {
    if (this.busy()) return;
    this.tried.set(true);
    if (this.problems().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .makeGroup({
        clientId: this.clientId,
        name: this.name.value.trim(),
        kind: this.kind(),
        note: this.note.value.trim() || null,
        contactIds: this.people().map((p) => p.id),
      })
      .subscribe({
        next: (group) => this.ref.close(group),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }
}
