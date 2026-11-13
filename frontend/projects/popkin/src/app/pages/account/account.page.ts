import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DeleteAccountDialog } from '../../dialogs/delete-account/delete-account.dialog';
import { SignOutDialog } from '../../dialogs/sign-out/sign-out.dialog';
import { Toaster } from '../../toasts/toaster';
import {
  ACCOUNT_API,
  AccountStore,
  DeletionImpactView,
  PHOTO_ACCEPT,
  THEME_PREFERENCES,
  ThemeChoice,
  initialsOf,
  photoProblem,
  photoProblemText,
} from 'api';
import {
  Alert,
  Button,
  EmptyState,
  FieldLabel,
  FormProblem,
  FormSummary,
  Icon,
  MenuItem,
  MenuList,
  PhotoPicker,
  Screen,
  SegmentedControl,
  SegmentedOption,
  Skeleton,
  StatusNote,
  TextField,
  TopBar,
} from 'components';

const NAME_MESSAGE = 'Enter a name so people know who you are.';

/** "Your account" (L2-048): how the person appears, the theme of this device, and signing out. */
@Component({
  selector: 'pk-account-page',
  imports: [
    Alert,
    Button,
    EmptyState,
    FieldLabel,
    FormSummary,
    Icon,
    MenuItem,
    MenuList,
    PhotoPicker,
    ReactiveFormsModule,
    RouterLink,
    Screen,
    SegmentedControl,
    Skeleton,
    StatusNote,
    TextField,
    TopBar,
  ],
  providers: [AccountStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
})
export class AccountPage {
  protected readonly store = inject(AccountStore);
  protected readonly theme = inject(THEME_PREFERENCES);
  private readonly dialog = inject(Dialog);
  private readonly accounts = inject(ACCOUNT_API);
  private readonly toaster = inject(Toaster);

  protected readonly accept = PHOTO_ACCEPT;
  protected readonly nameMessage = NAME_MESSAGE;
  protected readonly themes: SegmentedOption<ThemeChoice>[] = [
    { value: 'device', label: 'Match my device' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  protected readonly name = new FormControl('', { nonNullable: true });
  /** The sign-in contact, which is read-only (L2-048 AC1). */
  protected readonly contact = new FormControl('', { nonNullable: true });
  private readonly typed = toSignal(this.name.valueChanges, { initialValue: '' });
  protected readonly initials = computed(() => initialsOf(this.typed()));

  protected readonly photo = signal<File | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly pickedProblem = signal<string | undefined>(undefined);
  protected readonly photoUrl = computed(
    () => this.preview() ?? this.store.account()?.photoUrl ?? null,
  );
  protected readonly photoError = computed(() => {
    const refused = this.store.photoProblem();
    return this.pickedProblem() ?? (refused ? photoProblemText(refused) : undefined);
  });
  protected readonly problems = computed<FormProblem[]>(() =>
    this.store.nameInvalid()
      ? [{ fieldId: 'name', message: `Your name: ${lower(NAME_MESSAGE)}` }]
      : [],
  );
  private readonly summary = viewChild(FormSummary);
  protected readonly saving = computed(() => this.store.saveState() === 'saving');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
    // The name field starts with the account's name, once it has loaded.
    let filled = false;
    effect(() => {
      const account = this.store.account();
      if (account && !filled) {
        filled = true;
        untracked(() => {
          this.name.setValue(account.name);
          this.contact.setValue(account.destination);
        });
      }
    });
    // A photo once saved is the account's: the next save does not send it again.
    effect(() => {
      if (this.store.saveState() !== 'saved' || !untracked(this.photo)) return;
      untracked(() => {
        this.photo.set(null);
        this.releasePreview();
        this.preview.set(null);
      });
    });
    this.name.valueChanges.subscribe(() => this.store.edited());
    this.load();
  }

  protected load(): void {
    this.store.load();
  }

  protected pick(file: File): void {
    const problem = photoProblem(file);
    if (problem) {
      this.pickedProblem.set(photoProblemText(problem));
      return;
    }
    this.releasePreview();
    this.photo.set(file);
    this.preview.set(URL.createObjectURL(file));
    this.pickedProblem.set(undefined);
    this.store.edited();
  }

  protected save(event?: Event): void {
    event?.preventDefault();
    this.store.save(this.name.value, this.photo());
    // The summary takes focus once it is drawn, so it is read out (L2-048 AC3).
    if (this.store.nameInvalid()) setTimeout(() => this.summary()?.focus());
  }

  protected chooseTheme(choice: string): void {
    this.theme.set(choice as ThemeChoice);
  }

  /** "Sign out" asks first (L2-048 AC5); focus comes back here when it closes (L2-057 AC2). */
  protected signOut(): void {
    this.dialog.open(SignOutDialog, {
      ariaLabelledBy: 'dlg-title',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
  }

  /**
   * "Delete my account" reads what the deletion would wrap up first, so the dialog opens
   * complete (L2-049 AC3).
   */
  protected deleteAccount(): void {
    this.accounts.getDeletionImpact().subscribe({
      next: (impact) =>
        this.dialog.open<void, DeletionImpactView>(DeleteAccountDialog, {
          data: impact,
          ariaLabelledBy: 'dlg-title',
          autoFocus: '#confirm',
          hasBackdrop: false,
          ariaModal: true,
        }),
      // A failure stays until it is dismissed (L2-056 AC7).
      error: () =>
        this.toaster.show(
          'danger',
          'We couldn’t open that.',
          'Check your connection and try again.',
        ),
    });
  }

  private releasePreview(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
  }
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
