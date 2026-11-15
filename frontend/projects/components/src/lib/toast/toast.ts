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
 * screen. It sits in the toast region, which announces it politely. It says when it is held
 * (hovered or focused) and released, so the one who shows it can keep it while it is read.
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
    '(pointerenter)': 'held.emit()',
    '(focusin)': 'held.emit()',
    '(pointerleave)': 'released.emit()',
    '(focusout)': 'released.emit()',
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
  /** Hovered or focused: a toast that leaves on its own waits (L2-124 AC2). */
  readonly held = output<void>();
  /** No longer hovered or focused. */
  readonly released = output<void>();

  protected readonly icons = ICONS;
}
