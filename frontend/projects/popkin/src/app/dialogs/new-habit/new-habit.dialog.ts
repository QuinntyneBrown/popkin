import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CONTACTS_API, HABIT_RHYTHMS, HabitRhythm, HabitView, dayParam } from 'api';
import {
  Alert,
  Button,
  ChoiceChips,
  DialogFrame,
  FieldLabel,
  FormProblem,
  FormSummary,
  PersonPick,
  SelectField,
  SelectOption,
  TextField,
} from 'components';
import { forkJoin } from 'rxjs';

/** The contact a habit opened from a profile is with, as "With" shows them. */
export interface NewHabitContact {
  id: string;
  name: string;
  /** Who they are to me: "Sister". */
  text?: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
}

export interface NewHabitData {
  /** From a profile: that contact, with "Change". From Habits: none, and "With" is a choice. */
  contact?: NewHabitContact;
}

const WHAT_ERROR = 'Say what you’ll do together, like “Sunday call”.';
const WHAT_PROBLEM = 'What: say what you’ll do together.';
const WHAT_LONG = 'Keep it to 80 characters.';
const WITH_ERROR = 'Choose who the habit is with.';
const WITH_PROBLEM = 'With: choose who the habit is with.';

/**
 * New habit (L2-145): who it is with, what and how often. "What" and "With" are checked before
 * anything is sent (AC2, AC5); a contact who already has a habit is not offered (AC6). It closes
 * with the habit started; a failure keeps it open with what was chosen.
 */
@Component({
  selector: 'pk-new-habit-dialog',
  imports: [
    Alert,
    Button,
    ChoiceChips,
    DialogFrame,
    FieldLabel,
    FormSummary,
    PersonPick,
    ReactiveFormsModule,
    SelectField,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-habit.dialog.html',
})
export class NewHabitDialog {
  private readonly data = inject<NewHabitData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<HabitView>>(DialogRef);
  private readonly api = inject(CONTACTS_API);
  private clientId = crypto.randomUUID();

  protected readonly rhythms = HABIT_RHYTHMS.map((r) => ({ ...r }));
  protected readonly contact = signal<NewHabitContact | null>(this.data.contact ?? null);
  protected readonly people = signal<SelectOption[]>([{ value: '', label: 'Choose someone' }]);
  protected readonly who = signal('');
  protected readonly rhythm = signal<HabitRhythm>('Weekly');
  protected readonly what = new FormControl('', { nonNullable: true });
  private readonly whatValue = signal('');
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly tried = signal(false);
  private readonly summary = viewChild(FormSummary);

  protected readonly problems = computed<FormProblem[]>(() => {
    if (!this.tried()) return [];
    const problems: FormProblem[] = [];
    if (!this.contact() && !this.who()) problems.push({ fieldId: 'with', message: WITH_PROBLEM });
    const what = this.whatValue().trim();
    if (!what) problems.push({ fieldId: 'what', message: WHAT_PROBLEM });
    else if (what.length > 80)
      problems.push({ fieldId: 'what', message: `What: ${WHAT_LONG.toLowerCase()}` });
    return problems;
  });

  constructor() {
    this.what.valueChanges.subscribe((value) => this.whatValue.set(value));
    if (!this.contact()) this.readPeople();
  }

  protected error(fieldId: string): string | undefined {
    if (!this.problems().some((p) => p.fieldId === fieldId)) return undefined;
    if (fieldId === 'with') return WITH_ERROR;
    return this.whatValue().trim() ? WHAT_LONG : WHAT_ERROR;
  }

  /** "Change": "With" becomes a choice of my people with no habit yet (L2-145 AC5). */
  protected change(): void {
    this.contact.set(null);
    this.readPeople();
  }

  protected start(): void {
    if (this.busy()) return;
    this.tried.set(true);
    const contactId = this.contact()?.id ?? this.who();
    if (this.problems().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .startHabit({
        clientId: this.clientId,
        contactId,
        what: this.what.value.trim(),
        rhythm: this.rhythm(),
      })
      .subscribe({
        next: (habit) => this.ref.close(habit),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }

  private readPeople(): void {
    forkJoin([this.api.people(dayParam(new Date())), this.api.habits()]).subscribe(
      ([view, habits]) => {
        const taken = new Set(habits.map((h) => h.contactId));
        this.people.set([
          { value: '', label: 'Choose someone' },
          ...view.contacts
            .filter((c) => !taken.has(c.id))
            .map((c) => ({ value: c.id, label: c.name })),
        ]);
      },
    );
  }
}
