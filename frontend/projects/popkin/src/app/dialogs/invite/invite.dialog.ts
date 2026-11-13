import { DIALOG_DATA } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { InviteView, POPKINS_API, encodeQr } from 'api';
import { Alert, Button, DialogFrame, Icon, QrCard } from 'components';

export interface InviteData {
  popkinId: string;
  accent: string;
}

/**
 * "Bring someone in" (L2-011 AC1 to AC4): the Popkin's QR code and link, and "Copy invite
 * link". Any member may open it. The CDK dialog that opens it closes on Escape and returns
 * focus to what opened it.
 */
@Component({
  selector: 'pk-invite-dialog',
  imports: [Alert, Button, DialogFrame, Icon, QrCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite.dialog.html',
})
export class InviteDialog {
  protected readonly data = inject<InviteData>(DIALOG_DATA);
  private readonly popkins = inject(POPKINS_API);
  private readonly navigator = inject(DOCUMENT).defaultView?.navigator;
  private readonly copyButton = viewChild('copyButton', { read: ElementRef<HTMLElement> });
  private copiedTimer?: ReturnType<typeof setTimeout>;

  protected readonly invite = signal<InviteView | null>(null);
  protected readonly failed = signal(false);
  protected readonly copied = signal(false);
  protected readonly modules = computed(() => {
    const invite = this.invite();
    return invite ? encodeQr(invite.url) : [];
  });
  /** The link as people read it: no scheme. */
  protected readonly shownLink = computed(() =>
    (this.invite()?.url ?? '').replace(/^https?:\/\//, ''),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
    // The one action of the dialog takes the focus once there is a link to copy.
    let focused = false;
    afterRenderEffect(() => {
      const button = this.copyButton();
      if (!button || focused) return;
      focused = true;
      button.nativeElement.focus();
    });
    this.load();
  }

  protected load(): void {
    this.failed.set(false);
    this.popkins.getInvite(this.data.popkinId).subscribe({
      next: (invite) => this.invite.set(invite),
      error: () => this.failed.set(true),
    });
  }

  /** On the clipboard, "Copied" for 3 seconds, announced (L2-011 AC2). */
  protected async copy(): Promise<void> {
    const url = this.invite()?.url;
    if (!url || !this.navigator?.clipboard) return;
    await this.navigator.clipboard.writeText(url);
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 3_000);
  }
}
