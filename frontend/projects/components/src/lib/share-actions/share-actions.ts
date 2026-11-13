import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The row of ways to pass an invite on, under the QR card (the mocks' `share-actions`). */
@Component({
  selector: 'div[pk-share-actions]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-actions.html',
  styleUrl: './share-actions.scss',
  host: { class: 'share-actions' },
})
export class ShareActions {}
