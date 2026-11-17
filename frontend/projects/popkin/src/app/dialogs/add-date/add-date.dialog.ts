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
import {
  ADD_DATE_KINDS,
  CONTACTS_API,
  DEFAULT_REMINDERS,
  KeyDateDraft,
  KeyDateKind,
  KeyDateRowView,
  REMINDER_LEADS,
  ReminderLead,
  ReminderPreferencesView,
  dayFromInput,
  dayParam,
} from 'api';
import {
  Alert,
  Button,
  ChoiceChips,
  DialogFrame,
  FormProblem,
  FormSummary,
  SelectField,
  SelectOption,
  SettingRow,
  TextField,
} from 'components';

export interface AddDateData {
  /** From a profile: that contact alone. From Dates: none, and "For" offers my people. */
  contactId?: string;
  /** My defaults, when the opener has them; otherwise the dialog reads them. */
  preferences?: ReminderPreferencesView;
  /**
   * From Add someone or Edit: for the contact on the form, saving nothing; it closes with the
   * date for the form to save with the contact.
   */
  draft?: boolean;
}

const DAY_MESSAGE = 'Pick the day, so we know when to remind you.';
const DAY_PROBLEM = 'The day: pick it, so we know when to remind you.';
const FOR_MESSAGE = 'For: choose who the date is for.';

/**
 * Add a date (L2-138): who it is for, what kind, the day, its reminder and whether it comes round
 * every year. Choosing a kind sets "Remind me" to my default for it (AC3). It closes with the
 * saved date; a failure keeps it open with what was chosen.
 */
@Component({
  selector: 'pk-add-date-dialog',
  imports: [
    Alert,
    Button,
    ChoiceChips,
    DialogFrame,
    FormSummary,
    ReactiveFormsModule,
    SelectField,
    SettingRow,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-date.dialog.html',
})
export class AddDateDialog {
  protected readonly data = inject<AddDateData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<KeyDateRowView | KeyDateDraft>>(DialogRef);
  private readonly api = inject(CONTACTS_API);
  private readonly today = new Date();
  private clientId = crypto.randomUUID();

  protected readonly kinds = ADD_DATE_KINDS;
  protected readonly leads: SelectOption[] = REMINDER_LEADS.map((l) => ({ ...l }));
  protected readonly people = signal<SelectOption[]>([{ value: '', label: 'Choose someone' }]);
  protected readonly who = signal(this.data.contactId ?? (this.data.draft ? 'draft' : ''));
  protected readonly kind = signal<KeyDateKind>('Birthday');
  private preferences = this.data.preferences ?? DEFAULT_REMINDERS;
  protected readonly lead = signal<string>(this.preferences.birthdayLead);
  protected readonly everyYear = signal(true);
  protected readonly title = new FormControl('', { nonNullable: true });
  protected readonly day = new FormControl('', { nonNullable: true });
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly tried = signal(false);
  private readonly dayValue = signal('');
  protected readonly dayError = computed(() =>
    this.tried() && !dayFromInput(this.dayValue(), true, this.today) ? DAY_MESSAGE : undefined,
  );
  protected readonly problems = computed<FormProblem[]>(() => {
    if (!this.tried()) return [];
    const problems: FormProblem[] = [];
    if (!this.who()) problems.push({ fieldId: 'for', message: FOR_MESSAGE });
    if (this.dayError()) problems.push({ fieldId: 'day', message: DAY_PROBLEM });
    return problems;
  });
  private readonly summary = viewChild(FormSummary);

  constructor() {
    this.day.valueChanges.subscribe((value) => this.dayValue.set(value));
    if (!this.data.preferences) {
      this.api.reminderPreferences().subscribe((preferences) => {
        this.preferences = preferences;
        this.chooseKind(this.kind());
      });
    }
    if (!this.data.contactId && !this.data.draft) {
      this.api
        .people(dayParam(this.today))
        .subscribe((view) =>
          this.people.set([
            { value: '', label: 'Choose someone' },
            ...view.contacts.map((c) => ({ value: c.id, label: c.name })),
          ]),
        );
    }
  }

  /** A kind starts at my default for it; Something else at 1 week before (L2-138 AC3). */
  protected chooseKind(kind: string): void {
    const chosen = kind as KeyDateKind;
    this.kind.set(chosen);
    const p = this.preferences;
    this.lead.set(
      chosen === 'Birthday'
        ? p.birthdayLead
        : chosen === 'Anniversary'
          ? p.anniversaryLead
          : 'OneWeekBefore',
    );
  }

  protected save(): void {
    if (this.busy()) return;
    this.tried.set(true);
    const day = dayFromInput(this.day.value, this.everyYear(), this.today);
    if (!this.who() || !day) {
      setTimeout(() => this.summary()?.focus());
      return;
    }
    if (this.data.draft) {
      this.ref.close({
        kind: this.kind(),
        title: this.kind() === 'Other' ? this.title.value.trim() || null : null,
        month: day.month,
        day: day.day,
        year: day.year,
        everyYear: this.everyYear(),
        reminder: this.lead() as ReminderLead,
      });
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .addKeyDate(this.who(), {
        clientId: this.clientId,
        kind: this.kind(),
        title: this.kind() === 'Other' ? this.title.value.trim() || null : null,
        month: day.month,
        day: day.day,
        year: day.year,
        everyYear: this.everyYear(),
        lead: this.lead() as ReminderLead,
      })
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
          this.clientId = crypto.randomUUID();
        },
      });
  }
}
