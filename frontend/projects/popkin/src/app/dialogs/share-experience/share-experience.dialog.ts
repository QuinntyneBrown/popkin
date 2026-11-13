import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  DraftProblems,
  EXPERIENCES_API,
  EXPERIENCE_KINDS,
  ExperienceCardView,
  ExperienceKind,
  PHOTO_ACCEPT,
  PLACE_MAX,
  TITLE_MAX,
  draftProblems,
  fixSummary,
  kindLabel,
  refusedField,
  toApiProblem,
} from 'api';
import {
  Alert,
  Button,
  ChoiceChips,
  DialogFrame,
  FormSummary,
  PictureField,
  TextField,
} from 'components';

export interface ShareExperienceData {
  popkinId: string;
  accent: string;
  /** The experience to change; absent when a new one is shared. */
  editing?: {
    id: string;
    title: string;
    kind: ExperienceKind;
    when: string | null;
    place: string | null;
    pictureUrl: string | null;
  };
}

/** The ids of the dialog's fields, which its summary links to. */
const FIELD_IDS = { title: 'etitle', when: 'ewhen', place: 'eplace', picture: 'epicture' } as const;

/**
 * "Share an experience" (L2-040): a title and a kind, and optionally when it was, a place and
 * a picture. Opened with an experience, it is "Edit experience" and starts from what that one
 * has (L2-040 AC6). It closes with the experience that was shared or changed. The CDK dialog that opens it
 * closes on Escape and returns focus to what opened it.
 */
@Component({
  selector: 'pk-share-experience-dialog',
  imports: [
    Alert,
    Button,
    ChoiceChips,
    DialogFrame,
    FormSummary,
    PictureField,
    ReactiveFormsModule,
    TextField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-experience.dialog.html',
})
export class ShareExperienceDialog {
  protected readonly data = inject<ShareExperienceData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ExperienceCardView>>(DialogRef);
  private readonly api = inject(EXPERIENCES_API);

  protected readonly titleMax = TITLE_MAX;
  protected readonly placeMax = PLACE_MAX;
  protected readonly accept = PHOTO_ACCEPT;
  protected readonly kinds = EXPERIENCE_KINDS.map((kind) => ({
    value: kind,
    label: kindLabel(kind),
  }));

  private readonly editing = this.data.editing;
  protected readonly words = this.editing
    ? {
        heading: 'Edit experience',
        action: 'Save changes',
        busy: 'Saving…',
        failed: 'We couldn’t save that.',
      }
    : {
        heading: 'Share an experience',
        action: 'Share it',
        busy: 'Sharing…',
        failed: 'We couldn’t share that.',
      };

  protected readonly title = new FormControl(this.editing?.title ?? '', { nonNullable: true });
  protected readonly when = new FormControl(this.editing?.when ?? '', { nonNullable: true });
  protected readonly place = new FormControl(this.editing?.place ?? '', { nonNullable: true });
  protected readonly kind = signal<string>(this.editing?.kind ?? 'Did');
  private readonly picture = signal<File | null>(null);
  /** The picture chosen on the device, drawn before anything is sent. */
  private readonly chosen = signal<string | null>(null);
  /** The picture an edited experience has is to go. */
  private readonly removing = signal(false);
  /** The picture the field shows: the one just chosen, or the one the experience has. */
  protected readonly preview = computed(
    () => this.chosen() ?? (this.removing() ? null : (this.editing?.pictureUrl ?? null)),
  );

  protected readonly problems = signal<DraftProblems>({});
  protected readonly summary = computed(() =>
    (fixSummary(this.problems())?.items ?? []).map((item) => ({
      fieldId: FIELD_IDS[item.field],
      message: item.text,
    })),
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.forgetPreview());
  }

  protected picked(file: File): void {
    this.forgetPreview();
    this.picture.set(file);
    this.chosen.set(URL.createObjectURL(file));
    this.removing.set(false);
    this.problems.update((problems) => ({ ...problems, picture: undefined }));
  }

  protected removed(): void {
    this.forgetPreview();
    this.picture.set(null);
    this.removing.set(true);
    this.problems.update((problems) => ({ ...problems, picture: undefined }));
  }

  /** L2-040 AC2, AC3: what is wrong is said and nothing is sent; otherwise it is shared. */
  protected share(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    const draft = {
      title: this.title.value,
      kind: this.kind() as ExperienceKind,
      when: this.when.value,
      place: this.place.value,
      picture: this.picture(),
      removePicture: !!this.editing?.pictureUrl && this.removing(),
    };
    const problems = draftProblems(draft);
    this.problems.set(problems);
    this.failed.set(false);
    if (Object.keys(problems).length) return;

    this.busy.set(true);
    const saving = this.editing
      ? this.api.edit(this.data.popkinId, this.editing.id, draft)
      : this.api.share(this.data.popkinId, draft);
    saving.subscribe({
      next: (card) => this.ref.close(card),
      error: (error: unknown) => {
        this.busy.set(false);
        const refused = refusedField(toApiProblem(error).code);
        this.problems.set(refused ?? {});
        this.failed.set(!refused);
      },
    });
  }

  private forgetPreview(): void {
    const chosen = this.chosen();
    if (chosen) URL.revokeObjectURL(chosen);
    this.chosen.set(null);
  }
}
