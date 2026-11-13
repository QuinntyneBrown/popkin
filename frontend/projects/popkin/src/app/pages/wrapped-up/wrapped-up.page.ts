import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ErrorScreens, RecapStore } from 'api';
import {
  Banner,
  Button,
  EmptyState,
  Icon,
  Progress,
  Recap,
  RecapMoment,
  Screen,
  StackAvatar,
  TopBar,
} from 'components';
import { Toaster } from '../../toasts/toaster';

/**
 * The recap (L2-046): the front page of a Popkin that has wrapped up. It says what happened,
 * saves the album as a zip, and looks forward: the Host pops up another with this crew, a
 * member starts their own.
 */
@Component({
  selector: 'pk-wrapped-up-page',
  imports: [Banner, Button, EmptyState, Icon, Progress, Recap, RouterLink, Screen, TopBar],
  providers: [RecapStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrapped-up.page.html',
})
export class WrappedUpPage {
  protected readonly store = inject(RecapStore);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorScreens);
  private readonly toaster = inject(Toaster);
  private readonly document = inject(DOCUMENT);

  readonly popkinId = input.required<string>();

  protected readonly view = this.store.view;
  protected readonly accent = computed(() => this.view()?.accent ?? 'coral');
  protected readonly avatars = computed<StackAvatar[]>(() =>
    (this.view()?.avatars ?? []).map((avatar) => ({
      initials: avatar.initials,
      accent: avatar.accent.toLowerCase(),
      photo: avatar.photoUrl,
    })),
  );
  protected readonly moment = computed<RecapMoment | null>(() => {
    const view = this.view();
    const top = view?.topRated;
    return top
      ? {
          title: top.title,
          photo: top.photo,
          emoji: view.emoji,
          rating: top.score,
          by: top.by,
          link: ['/p', this.popkinId(), 'experiences', top.experienceId],
        }
      : null;
  });

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => this.store.open(popkinId));
    });
    effect(() => {
      const state = this.store.state();
      untracked(() => {
        if (state === 'not-found') this.errors.showNotFound();
        // It has not wrapped up: its home is the place to be.
        if (state === 'active') {
          void this.router.navigate(['/p', this.popkinId()], { replaceUrl: true });
        }
      });
    });
    // The zip is an attachment: the browser saves it and the recap stays.
    this.store.download$
      .pipe(takeUntilDestroyed())
      .subscribe((url) => this.document.location.assign(url));
    this.store.exportFailed$.pipe(takeUntilDestroyed()).subscribe(() =>
      this.toaster.show('danger', 'We couldn’t prepare the album', 'The photos are still there.', {
        label: 'Try again',
        run: () => this.store.saveAlbum(),
      }),
    );
  }
}
