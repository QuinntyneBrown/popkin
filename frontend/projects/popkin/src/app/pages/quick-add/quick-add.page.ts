import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CONTACT_CIRCLES,
  ContactCircle,
  PHONE_CONTACTS,
  PHOTO_ACCEPT,
  QUICK_ADD_CIRCLE,
  QuickAddSession,
  QuickAddStore,
  SAVE_FAILED_TEXT,
  canQuickAdd,
  saveFailedHeading,
} from 'api';
import {
  Banner,
  Button,
  ChipOption,
  ChoiceChips,
  Icon,
  Link,
  PhotoPicker,
  Screen,
  TextField,
  TopBar,
} from 'components';

/**
 * Quick Add (L2-177 to L2-179): someone added in moments, with a name only. It opens from the
 * shortcut on Popkin's icon with the name focused, and after a save opens Added.
 */
@Component({
  selector: 'pk-quick-add-page',
  imports: [
    Banner,
    Button,
    ChoiceChips,
    Icon,
    Link,
    PhotoPicker,
    ReactiveFormsModule,
    Screen,
    TextField,
    TopBar,
  ],
  providers: [QuickAddStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-add.page.html',
})
export class QuickAddPage {
  protected readonly store = inject(QuickAddStore);
  private readonly router = inject(Router);
  /** The phone's own contacts, offered only where the browser can share them (L2-179 AC3). */
  protected readonly phoneContacts = inject(PHONE_CONTACTS);
  protected readonly accept = PHOTO_ACCEPT;
  protected readonly circles: ChipOption<ContactCircle>[] = CONTACT_CIRCLES.map((circle) => ({
    value: circle,
    label: circle,
  }));
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    knownAs: new FormControl('', { nonNullable: true }),
  });
  protected readonly circle = signal<string>(QUICK_ADD_CIRCLE);
  protected readonly photo = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly saving = computed(() => this.store.state() === 'saving');
  private readonly typedName = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });
  protected readonly canSave = computed(() => canQuickAdd(this.typedName()));
  /** "We couldn’t save Femi." (L2-178 AC5). */
  protected readonly failedHeading = computed(() => saveFailedHeading(this.typedName()));
  protected readonly failedText = SAVE_FAILED_TEXT;
  private readonly name = viewChild.required<TextField>('name');

  constructor() {
    // A new count starts here, unless Added's "Add another" opened Quick Add (L2-181 AC2).
    inject(QuickAddSession).opened();
    inject(DestroyRef).onDestroy(() => this.releasePreview());
    // The name is focused as Quick Add opens, so a name can be typed at once (L2-177 AC2).
    afterNextRender(() => this.name().focus());
    // Added opens once they are kept (L2-178 AC4).
    effect(() => {
      const saved = this.store.saved();
      if (saved) void this.router.navigate(['/contacts/people', saved.id, 'added']);
    });
    // Kept offline: the outbox says so, and Quick Add starts again for the next person.
    effect(() => {
      if (this.store.kept() > 0) this.reset();
    });
    // Nothing can be typed while saving (L2-123 AC5).
    effect(() => {
      if (this.saving()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  protected pick(file: File): void {
    this.releasePreview();
    this.photo.set(file);
    this.preview.set(URL.createObjectURL(file));
  }

  /** One of the phone's contacts fills the name and "Phone"; none picked changes nothing (L2-179). */
  protected async pickFromPhone(): Promise<void> {
    const picked = await this.phoneContacts.pickOne();
    if (!picked) return;
    this.form.controls.name.setValue(picked.name);
    if (picked.phone) this.form.controls.phone.setValue(picked.phone);
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.store.save(
      { ...this.form.getRawValue(), circle: this.circle() as ContactCircle },
      this.photo(),
    );
  }

  private reset(): void {
    this.form.reset();
    this.circle.set(QUICK_ADD_CIRCLE);
    this.releasePreview();
    this.photo.set(null);
    this.preview.set(null);
    this.name().focus();
  }

  private releasePreview(): void {
    const preview = this.preview();
    if (preview) URL.revokeObjectURL(preview);
  }
}
