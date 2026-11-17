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
import { RouterLink } from '@angular/router';
import {
  CONNECT_FIRST_ERROR,
  CONNECT_FIRST_SUMMARY,
  CONNECT_WORDS_ERROR,
  CONNECT_WORDS_MAX,
  CONNECT_WORDS_SUMMARY,
  CONNECTION_KINDS,
  CONTACTS_API,
  ConnectionDraft,
  ConnectionKindName,
  ConnectionView,
  ContactRowView,
  connectNoResults,
  connectTitle,
  connectWhoError,
  connectWhoSummary,
  dayParam,
  matchesName,
} from 'api';
import {
  Alert,
  Button,
  ChoiceChips,
  DialogFrame,
  EmptyState,
  FormProblem,
  FormSummary,
  Icon,
  PersonChoice,
  PersonChoiceOption,
  SearchField,
  SelectField,
  SelectOption,
  SettingRow,
  TextField,
} from 'components';
import { forkJoin } from 'rxjs';

/** The contact Connect opens for. */
export interface ConnectContact {
  id: string;
  firstName: string;
}

export interface ConnectPersonData {
  /** The contact to connect; none from the empty map, which asks "Connect" first (L2-150 AC7). */
  contact?: ConnectContact;
  /**
   * `save` (the default) connects them now; `draft`, from Add someone or Edit, sends nothing and
   * closes with what was chosen, saved with the contact (L2-150 AC9).
   */
  mode?: 'save' | 'draft';
  /** Who "Who" leaves out besides the contact: those already connected, or chosen in the form. */
  exclude?: readonly string[];
}

/** What Connect closes with: the connection made, or a draft with the person chosen. */
export interface ConnectPersonResult {
  connection?: ConnectionView;
  draft?: ConnectionDraft;
  person: PersonChoiceOption;
}

/**
 * Connect (L2-150): who, how they know each other and, optionally, in my words, with "Not
 * introduced yet" for a dotted line. "Who" lists my contacts but the contact and anyone already
 * connected to them (AC5); nobody chosen is refused before anything is sent (AC2); a search
 * that matches nobody offers to add them (AC3).
 */
@Component({
  selector: 'pk-connect-person-dialog',
  imports: [
    Alert,
    Button,
    ChoiceChips,
    DialogFrame,
    EmptyState,
    FormSummary,
    Icon,
    PersonChoice,
    ReactiveFormsModule,
    RouterLink,
    SearchField,
    SelectField,
    SettingRow,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connect-person.dialog.html',
})
export class ConnectPersonDialog {
  private readonly data = inject<ConnectPersonData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ConnectPersonResult>>(DialogRef);
  private readonly api = inject(CONTACTS_API);
  private readonly clientId = crypto.randomUUID();

  protected readonly fixed = this.data.contact ?? null;
  protected readonly kinds = CONNECTION_KINDS.map((k) => ({ value: k, label: k }));
  private readonly contacts = signal<ContactRowView[]>([]);
  private readonly connected = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map());
  protected readonly first = signal('');
  protected readonly search = signal('');
  protected readonly who = signal<string | null>(null);
  protected readonly kind = signal<ConnectionKindName>('Family');
  protected readonly words = new FormControl('', { nonNullable: true });
  private readonly wordsValue = signal('');
  protected promised = false;
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly tried = signal(false);
  private readonly summary = viewChild(FormSummary);

  /** The contact being connected: the one it opened for, or the one chosen in "Connect". */
  private readonly contactId = computed(() => this.fixed?.id ?? this.first());
  private readonly firstName = computed(
    () =>
      this.fixed?.firstName ??
      this.contacts().find((c) => c.id === this.first())?.firstName ??
      null,
  );

  protected readonly title = connectTitle(this.fixed?.firstName ?? null);

  protected readonly firsts = computed<SelectOption[]>(() => [
    { value: '', label: 'Choose someone' },
    ...this.contacts().map((c) => ({ value: c.id, label: c.name })),
  ]);

  /** "Who": my contacts but the contact and anyone already connected to them, as searched. */
  protected readonly options = computed<PersonChoiceOption[]>(() => {
    const id = this.contactId();
    const left = new Set([id, ...(this.data.exclude ?? []), ...(this.connected().get(id) ?? [])]);
    const search = this.search();
    return this.contacts()
      .filter((c) => !left.has(c.id) && matchesName(c.name, search))
      .map((c) => ({
        id: c.id,
        name: c.name,
        initials: c.initials,
        photo: c.photoUrl,
        accent: c.accent.toLowerCase(),
      }));
  });

  protected readonly noResults = computed(() => {
    const search = this.search().trim();
    return search && this.contacts().length && !this.options().length
      ? connectNoResults(search, this.firstName())
      : null;
  });

  protected readonly problems = computed<FormProblem[]>(() => {
    if (!this.tried()) return [];
    const problems: FormProblem[] = [];
    if (!this.fixed && !this.first())
      problems.push({ fieldId: 'first', message: CONNECT_FIRST_SUMMARY });
    if (!this.who())
      problems.push({ fieldId: 'people-list', message: connectWhoSummary(this.firstName()) });
    if (this.wordsValue().trim().length > CONNECT_WORDS_MAX)
      problems.push({ fieldId: 'label', message: CONNECT_WORDS_SUMMARY });
    return problems;
  });

  constructor() {
    this.words.valueChanges.subscribe((value) => this.wordsValue.set(value));
    forkJoin([this.api.people(dayParam(new Date())), this.api.connectionMap()]).subscribe(
      ([view, map]) => {
        const connected = new Map<string, Set<string>>();
        for (const c of map.connections) {
          if (!connected.has(c.contactId)) connected.set(c.contactId, new Set());
          if (!connected.has(c.otherContactId)) connected.set(c.otherContactId, new Set());
          connected.get(c.contactId)!.add(c.otherContactId);
          connected.get(c.otherContactId)!.add(c.contactId);
        }
        this.connected.set(connected);
        this.contacts.set(view.contacts);
      },
    );
  }

  protected error(fieldId: string): string | undefined {
    if (!this.problems().some((p) => p.fieldId === fieldId)) return undefined;
    if (fieldId === 'first') return CONNECT_FIRST_ERROR;
    if (fieldId === 'label') return CONNECT_WORDS_ERROR;
    return connectWhoError(this.firstName());
  }

  /** "Add “{name}”": Add someone opens with the name (L2-150 AC8); this closes. */
  protected adding(): void {
    this.ref.close();
  }

  protected connect(): void {
    if (this.busy()) return;
    this.tried.set(true);
    if (this.problems().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }
    const other = this.who()!;
    const person = this.options().find((o) => o.id === other)!;
    const words = this.words.value.trim() || null;
    if (this.data.mode === 'draft') {
      this.ref.close({
        draft: { otherContactId: other, kind: this.kind(), words, promised: this.promised },
        person,
      });
      return;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .connect({
        clientId: this.clientId,
        contactId: this.contactId(),
        otherContactId: other,
        kind: this.kind(),
        words,
        promised: this.promised,
      })
      .subscribe({
        next: (connection) => this.ref.close({ connection, person }),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }
}
