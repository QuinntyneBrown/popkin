import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlbumStore, ErrorScreens, PHOTO_ACCEPT, PopkinFrame, UnreadTracker, accentOf } from 'api';
import {
  Album,
  Banner,
  Alert,
  AppScreen,
  Button,
  Chip,
  EmptyState,
  Fab,
  FilesInput,
  GroupLabel,
  Icon,
  PhotoGrid,
  PopkinNav,
  TabHeader,
} from 'components';
import { AddPhotosData, AddPhotosDialog } from '../../dialogs/add-photos/add-photos.dialog';

/** How many of the people who added photos the header shows; the rest are "+N". */
const FACES = 4;

/**
 * Photos, the Popkin's shared album (L2-032): the photos under their days, Everyone's or the
 * member's own, more as they scroll, and the way to add some (L2-031). The album is kept while
 * a photo is open, so closing it returns to the same place (L2-033 AC2).
 */
@Component({
  selector: 'pk-photo-album-page',
  imports: [
    Album,
    Banner,
    Alert,
    AppScreen,
    Button,
    Chip,
    EmptyState,
    Fab,
    FilesInput,
    GroupLabel,
    Icon,
    PhotoGrid,
    PopkinNav,
    RouterLink,
    TabHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-album.page.html',
})
export class PhotoAlbumPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  protected readonly store = inject(AlbumStore);
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  protected readonly accept = PHOTO_ACCEPT;
  protected readonly faces = computed(() =>
    this.store
      .contributors()
      .slice(0, FACES)
      .map(({ avatar }) => ({
        initials: avatar.initials,
        accent: accentOf(avatar.accent),
        photo: avatar.photoUrl,
      })),
  );
  protected readonly more = computed(() =>
    Math.max(0, this.store.contributorCount() - this.faces().length),
  );
  protected readonly days = computed(() =>
    this.store.days().map((day) => ({
      key: day.key,
      label: day.label,
      photos: day.photos.map((photo) => ({
        link: ['/p', this.popkinId(), 'photos', photo.id],
        src: photo.src,
        alt: photo.name,
        feature: photo.feature,
      })),
    })),
  );
  /** The filters show while the album loads and while there is an album to filter. */
  protected readonly filtering = computed(() =>
    ['loading', 'ready', 'no-results'].includes(this.store.state()) ? 'Filter' : undefined,
  );
  /** "Add photos" in the header and floating: where photos show, or are about to. */
  protected readonly adding = computed(
    () => this.canAdd() && ['loading', 'ready'].includes(this.store.state()),
  );
  /** Nothing is added to a Popkin that has wrapped up (L2-045 AC3). */
  protected readonly canAdd = computed(() => this.store.canAdd() && !this.frame.wrappedUp());
  protected readonly recap = computed(() => ['/p', this.popkinId(), 'recap']);
  /** What became of an album that was not kept, once its photos went (L2-045 AC4). */
  protected readonly removedText = computed(
    () =>
      `The album wasn’t kept when ${this.frame.name()} wrapped up, so its photos went after 30 days. The chat and the experiences are still here.`,
  );
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => {
        this.frame.open(popkinId);
        this.store.open(popkinId);
      });
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
    this.returnToThePhotoLeft();
    this.readMoreAtTheEnd();
  }

  /** Opens "Add photos" with what the member chose (L2-031 AC1). */
  protected chosen(files: File[]): void {
    const opened = this.dialog.open<void, AddPhotosData>(AddPhotosDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), files },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe(() => this.store.refresh());
  }

  /** Back from a photo: the one last seen is on screen again, and holds the focus. */
  private returnToThePhotoLeft(): void {
    let left = this.store.takeLastSeen();
    afterRenderEffect(() => {
      this.days();
      if (!left) return;
      const cell = this.host.nativeElement.querySelector<HTMLElement>(`a[href$="/photos/${left}"]`);
      if (!cell) return;
      left = null;
      cell.scrollIntoView({ block: 'center' });
      cell.focus({ preventScroll: true });
    });
  }

  /** L2-032 AC6: the next page is asked for as its place comes near the screen. */
  private readMoreAtTheEnd(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.store.more();
      },
      { rootMargin: '600px' },
    );
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    afterRenderEffect(() => {
      // Observed afresh after each page, so a page too short to fill the screen asks again.
      this.days();
      observer.disconnect();
      const sentinel = this.sentinel();
      if (sentinel) observer.observe(sentinel.nativeElement);
    });
  }
}
