import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CONTACT_CIRCLES,
  ContactCircle,
  ContactFormStore,
  NOT_FOUND_TEXT,
  PHOTO_ACCEPT,
  SAVE_FAILED_TEXT,
  Toaster,
  contactValuesOf,
  editHeading,
  failedText,
  saveFailedHeading,
} from 'api';
import {
  Banner,
  Button,
  ChipOption,
  EmptyState,
  ChoiceChips,
  FormPair,
  FormProblem,
  FormSection,
  FormSections,
  FormSummary,
  PhotoPicker,
  Screen,
  TextField,
  TopBar,
} from 'components';

const NAME_MESSAGE = 'Add a name so you can find them later.';

/**
 * Add someone (L2-129) and Edit (L2-130): who they are and their details, kept for me alone.
 * With a `contactId` from the route it edits that contact, and their photo is shown as it is.
 */
@Component({
  selector: 'pk-contact-form-page',
  imports: [
    Banner,
    Button,
    ChoiceChips,
    EmptyState,
    FormPair,
    FormSection,
    FormSections,
    FormSummary,
    PhotoPicker,
    ReactiveFormsModule,
    RouterLink,
    Screen,
    TextField,
    TopBar,
  ],
  providers: [ContactFormStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-form.page.html',
})
export class ContactFormPage {
  /** The contact being edited, from `/contacts/people/:contactId/edit`; none when adding. */
  readonly contactId = input<string>();
  protected readonly store = inject(ContactFormStore);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  protected readonly notFound = NOT_FOUND_TEXT;
  protected readonly unread = failedText(null);
  protected readonly accept = PHOTO_ACCEPT;
  protected readonly nameMessage = NAME_MESSAGE;
  protected readonly circles: ChipOption<ContactCircle>[] = CONTACT_CIRCLES.map((circle) => ({
    value: circle,
    label: circle,
  }));
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    knownAs: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    howWeMet: new FormControl('', { nonNullable: true }),
    loves: new FormControl('', { nonNullable: true }),
  });
  /** No circle until one is chosen. */
  protected readonly circle = signal('');
  protected readonly photo = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly saving = computed(() => this.store.state() === 'saving');
  protected readonly problems = computed<FormProblem[]>(() =>
    this.store.state() === 'invalid'
      ? [{ fieldId: 'name', message: 'Name: add a name so you can find them later.' }]
      : [],
  );
  private readonly summary = viewChild(FormSummary);
  private readonly typedName = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });
  /** "We couldn’t save Femi." (L2-129 AC6). */
  protected readonly failedHeading = computed(() => saveFailedHeading(this.typedName()));
  protected readonly failedText = SAVE_FAILED_TEXT;
  protected readonly heading = computed(() => {
    const editing = this.store.editing();
    return editing ? editHeading(editing.firstName) : 'Add someone';
  });
  /** Cancel opens People after an add, or the profile after an edit (L2-129 AC7, L2-130 AC2). */
  protected readonly back = computed(() => {
    const contactId = this.contactId();
    return contactId ? `/contacts/people/${contactId}` : '/contacts/people';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
    effect(() => {
      const contactId = this.contactId();
      if (contactId) this.store.edit(contactId);
    });
    // Edit shows every value they have (L2-130 AC1).
    effect(() => {
      const editing = this.store.editing();
      if (!editing) return;
      const { circle, ...values } = contactValuesOf(editing);
      this.form.setValue(values);
      this.circle.set(circle ?? '');
    });
    // The contact's profile opens once they are kept, saying so after an add (L2-129 AC5).
    effect(() => {
      const saved = this.store.saved();
      if (!saved) return;
      if (!this.contactId())
        this.toaster.show('success', `${saved.firstName} is in your Contacts.`);
      void this.router.navigate(['/contacts/people', saved.id]);
    });
  }

  protected pick(file: File): void {
    this.releasePreview();
    this.photo.set(file);
    this.preview.set(URL.createObjectURL(file));
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.store.save(
      { ...this.form.getRawValue(), circle: (this.circle() as ContactCircle) || null },
      this.photo(),
    );
    // "One thing to fix" takes focus once it is drawn, so it is read out (L2-129 AC4).
    if (this.store.state() === 'invalid') setTimeout(() => this.summary()?.focus());
  }

  private releasePreview(): void {
    const preview = this.preview();
    if (preview) URL.revokeObjectURL(preview);
  }
}
