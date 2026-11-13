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
}

/** The ids of the dialog's fields, which its summary links to. */
const FIELD_IDS = { title: 'etitle', when: 'ewhen', place: 'eplace', picture: 'epicture' } as const;

/**
 * "Share an experience" (L2-040): a title and a kind, and optionally when it was, a place and
 * a picture. It closes with the experience that was shared. The CDK dialog that opens it
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

  protected readonly title = new FormControl('', { nonNullable: true });
  protected readonly when = new FormControl('', { nonNullable: true });
  protected readonly place = new FormControl('', { nonNullable: true });
  protected readonly kind = signal<string>('Did');
  private readonly picture = signal<File | null>(null);
  /** The chosen picture, drawn from the device before anything is sent. */
  protected readonly preview = signal<string | null>(null);

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
    this.preview.set(URL.createObjectURL(file));
    this.problems.update((problems) => ({ ...problems, picture: undefined }));
  }

  protected removed(): void {
    this.forgetPreview();
    this.picture.set(null);
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
    };
    const problems = draftProblems(draft);
    this.problems.set(problems);
    this.failed.set(false);
    if (Object.keys(problems).length) return;

    this.busy.set(true);
    this.api.share(this.data.popkinId, draft).subscribe({
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
    const preview = this.preview();
    if (preview) URL.revokeObjectURL(preview);
    this.preview.set(null);
  }
}
