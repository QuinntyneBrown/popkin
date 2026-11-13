import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ErrorScreens,
  PHOTOS_API,
  POPKINS_API,
  PopkinHomeView,
  WrapUpPreviewView,
  accentOf,
  keepAlbumLine,
  recapPreviewLine,
  toApiProblem,
  wrapUpLede,
} from 'api';
import {
  Alert,
  Button,
  EmptyState,
  Fact,
  Facts,
  Icon,
  Screen,
  SettingRow,
  SplitAside,
  TopBar,
} from 'components';
import { catchError, forkJoin, of } from 'rxjs';

/**
 * Wrap up (L2-043): the Host ends the Popkin on purpose, knowing what follows. A member who
 * is not the Host is sent to the Popkin home, and a Popkin that has wrapped up to its recap.
 */
@Component({
  selector: 'pk-wrap-up-page',
  imports: [
    Alert,
    Button,
    EmptyState,
    Fact,
    Facts,
    Icon,
    RouterLink,
    Screen,
    SettingRow,
    SplitAside,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrap-up.page.html',
})
export class WrapUpPage {
  private readonly popkins = inject(POPKINS_API);
  private readonly photos = inject(PHOTOS_API);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorScreens);

  readonly popkinId = input.required<string>();

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly popkin = signal<PopkinHomeView | null>(null);
  private readonly preview = signal<WrapUpPreviewView | null>(null);
  /** Some of the Popkin's photos, for the recap the screen previews. */
  protected readonly pictures = signal<string[]>([]);

  protected readonly keepPhotos = signal(true);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected readonly home = computed(() => ['/p', this.popkinId()]);
  protected readonly accent = computed(() => {
    const popkin = this.popkin();
    return popkin ? accentOf(popkin.colour) : 'coral';
  });
  protected readonly name = computed(() => this.popkin()?.name ?? '');
  protected readonly emoji = computed(() => this.popkin()?.emoji ?? '');
  protected readonly lede = computed(() => wrapUpLede(this.preview()?.memberCount ?? 0));
  protected readonly recapLine = computed(() => {
    const preview = this.preview();
    return preview ? recapPreviewLine(preview.photoCount, preview.messageCount) : '';
  });
  protected readonly keepLine = computed(() => keepAlbumLine(this.keepPhotos()));

  constructor() {
    effect(() => {
      this.popkinId();
      untracked(() => this.read());
    });
  }

  protected read(): void {
    const popkinId = this.popkinId();
    this.state.set('loading');
    forkJoin({
      popkin: this.popkins.getHome(popkinId),
      preview: this.popkins.getWrapUpPreview(popkinId),
      // The pictures are decoration: the screen opens without them.
      photos: this.photos.getSummary(popkinId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ popkin, preview, photos }) => {
        this.popkin.set(popkin);
        this.preview.set(preview);
        this.pictures.set((photos?.photos ?? []).slice(0, 6).map((photo) => photo.thumbnailUrl));
        this.state.set('ready');
      },
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        if (problem.code === 'popkin_wrapped_up') this.openRecap();
        else if (problem.code === 'host_only') void this.router.navigate(this.home());
        else if (problem.status === 404) this.errors.showNotFound();
        else this.state.set('error');
      },
    });
  }

  /** "Wrap it up" (L2-043 AC3, AC5). */
  protected wrapUp(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.popkins.wrapUp(this.popkinId(), this.keepPhotos()).subscribe({
      next: () => this.openRecap(),
      error: (error: unknown) => {
        // It ended a moment earlier, by its Host elsewhere or by its time: the recap is there.
        if (toApiProblem(error).code === 'popkin_wrapped_up') return this.openRecap();
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  /** Back does not return to the question of a Popkin that has ended. */
  private openRecap(): void {
    void this.router.navigate(['/p', this.popkinId(), 'recap'], { replaceUrl: true });
  }
}
