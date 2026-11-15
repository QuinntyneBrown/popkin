import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  ADMIN_PLATFORM_API,
  ActionDialogState,
  AdminFeature,
  FEATURE_ADD_FAILED,
  FeaturePopkinMatch,
  accentOf,
  addPopkinNotes,
  addPopkinText,
  type PopkinColour,
} from 'api';
import { Alert, Button, DialogFrame, PickList, PickListOption, SearchField } from 'components';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

/** How long typing rests before the search is sent. */
const SEARCH_DELAY_MS = 300;

/**
 * "Add a Popkin to Schedules" (L2-076 AC6): searches live Popkins by name or invite code, marks
 * one that already has the feature, and adds the one picked. It closes with the feature as saved.
 */
@Component({
  selector: 'pk-feature-add-popkin-dialog',
  imports: [Alert, Button, DialogFrame, PickList, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-add-popkin.dialog.html',
})
export class FeatureAddPopkinDialog {
  protected readonly feature = inject<AdminFeature>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<AdminFeature>>(DialogRef);
  private readonly api = inject(ADMIN_PLATFORM_API);

  protected readonly state = new ActionDialogState('Optional');
  protected readonly failed = FEATURE_ADD_FAILED;
  protected readonly description = addPopkinText(this.feature.feature);
  protected readonly text = signal('');
  protected readonly picked = signal<string | null>(null);
  private readonly matches = signal<FeaturePopkinMatch[]>([]);
  /** The text the matches answer, so the notes never speak of an older search. */
  private readonly answered = signal('');

  protected readonly busy = computed(() => this.state.status() === 'busy');
  protected readonly options = computed<PickListOption[]>(() =>
    this.matches()
      .filter((m) => !m.alreadyOn)
      .map((m) => ({
        id: m.popkinId,
        name: m.name,
        emoji: m.emoji,
        accent: accentOf(m.colour as PopkinColour),
        detail: m.inviteCode,
      })),
  );
  protected readonly notes = computed(() =>
    addPopkinNotes(this.feature.feature, this.answered(), this.matches()),
  );

  constructor() {
    toObservable(this.text)
      .pipe(
        debounceTime(SEARCH_DELAY_MS),
        distinctUntilChanged(),
        switchMap((text) =>
          text.trim()
            ? this.api.searchPopkins(this.feature.feature, text.trim()).pipe(
                catchError(() => of<FeaturePopkinMatch[]>([])),
                switchMap((found) => of({ text, found })),
              )
            : of({ text, found: [] as FeaturePopkinMatch[] }),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(({ text, found }) => {
        this.answered.set(text);
        this.matches.set(found);
        if (!found.some((m) => m.popkinId === this.picked() && !m.alreadyOn)) {
          this.picked.set(null);
        }
      });
  }

  protected async confirm(): Promise<void> {
    const popkinId = this.picked();
    if (!popkinId) return;
    this.ref.disableClose = true;
    const saved = await this.state.confirm('', () =>
      this.api.addPopkin(this.feature.feature, popkinId, null),
    );
    this.ref.disableClose = false;
    if (saved) this.ref.close(saved);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }
}
