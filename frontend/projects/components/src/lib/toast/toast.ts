import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { IconName } from '../icon/icons';

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

const ICONS: Record<ToastVariant, IconName> = {
  success: 'check-circle',
  info: 'alert',
  warning: 'alert',
  danger: 'alert',
};

/**
 * Toast (docs/design-system/components/toast.html): confirms an action that changed nothing on
 * screen. It sits in the toast region, which announces it politely.
 */
@Component({
  selector: 'div[pk-toast]',
  imports: [Icon, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  host: {
    class: 'toast',
    '[class.toast--success]': "variant() === 'success'",
    '[class.toast--warning]': "variant() === 'warning'",
    '[class.toast--danger]': "variant() === 'danger'",
  },
})
export class Toast {
  readonly variant = input<ToastVariant>('success');
  readonly heading = input.required<string>();
  readonly text = input<string>();
  /** What the toast offers to do about it: "Try again", "Undo". None when absent. */
  readonly action = input<string>();
  readonly acted = output<void>();
  readonly dismissed = output<void>();

  protected readonly icons = ICONS;
}
