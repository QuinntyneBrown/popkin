import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ErrorScreens, InviteView, POPKINS_API, accentOf, encodeQr, toApiProblem } from 'api';
import { Alert, Button, Link, Pop, QrCard, Screen, ShareAction, ShareActions } from 'components';

/** The created screen: the Host gets the new Popkin's invite straight away (L2-010, L2-011 AC6). */
@Component({
  selector: 'pk-popkin-created-page',
  imports: [Alert, Button, Link, Pop, QrCard, RouterLink, Screen, ShareAction, ShareActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-created.page.html',
})
export class PopkinCreatedPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  private readonly popkins = inject(POPKINS_API);
  private readonly errors = inject(ErrorScreens);
  private readonly router = inject(Router);
  private readonly navigator = inject(DOCUMENT).defaultView?.navigator;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  protected readonly invite = signal<InviteView | null>(null);
  protected readonly failed = signal(false);
  protected readonly copied = signal(false);
  protected readonly canShare = typeof this.navigator?.share === 'function';

  protected readonly accent = computed(() => {
    const invite = this.invite();
    return invite ? accentOf(invite.colour) : 'coral';
  });
  protected readonly modules = computed(() => {
    const invite = this.invite();
    return invite ? encodeQr(invite.url) : [];
  });
  /** The link as people read it: no scheme. */
  protected readonly shownLink = computed(() =>
    (this.invite()?.url ?? '').replace(/^https?:\/\//, ''),
  );
  protected readonly textHref = computed(
    () => `sms:?&body=${encodeURIComponent(this.invite()?.url ?? '')}`,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
    queueMicrotask(() => this.load());
  }

  protected load(): void {
    this.failed.set(false);
    this.popkins.getInvite(this.popkinId()).subscribe({
      next: (invite) => this.invite.set(invite),
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        if (problem.status >= 500) {
          const reference = problem.extensions['reference'];
          this.errors.showServerError(
            typeof reference === 'string' ? reference : undefined,
            this.router.url,
          );
          return;
        }
        this.failed.set(true);
      },
    });
  }

  /** Copy link: on the clipboard, "Copied" for 3 seconds, announced (L2-010 AC2). */
  protected async copy(): Promise<void> {
    const url = this.invite()?.url;
    if (!url || !this.navigator?.clipboard) return;
    await this.navigator.clipboard.writeText(url);
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 3_000);
  }

  /** Share: the device's share sheet with the link (L2-010 AC4). */
  protected async share(): Promise<void> {
    const invite = this.invite();
    if (!invite || !this.navigator?.share) return;
    try {
      await this.navigator.share({ title: invite.popkinName, url: invite.url });
    } catch {
      // Closing the share sheet without sharing is not a failure.
    }
  }
}
