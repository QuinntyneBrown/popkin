import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';

/**
 * Dialog and sheet (docs/design-system/components/dialog.html): the frame every dialog's content
 * sits in. Under 640 px a sheet at the bottom, from 640 px centred (L2-058 AC4). The CDK dialog
 * that opens it traps focus, closes on Escape and returns focus (L2-057 AC2); its container is
 * the `dialog` role, labelled by `dlg-title` and described by `dlg-desc`.
 */
@Component({
  // On `<form>` the fields project straight into the body and the footer's submit is inside it.
  selector: 'div[pk-dialog], form[pk-dialog]',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  host: { '[attr.data-accent]': 'accent()' },
})
export class DialogFrame {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly accent = input<string>();

  protected readonly ref = inject(DialogRef);
}
