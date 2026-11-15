import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';

/**
 * Admin drawer (docs/design-system/components/admin-shell.html): the console's sections below
 * 1024 px, a panel from the left over a backdrop, with "Close menu". The menu dialog opens it
 * in a CDK dialog, which traps focus and gives it back (L2-089 AC2). The default slot holds
 * `pk-admin-nav`.
 */
@Component({
  selector: 'div[pk-admin-drawer]',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-drawer.html',
  styleUrl: './admin-drawer.scss',
})
export class AdminDrawer {
  /** "Close menu" or the backdrop was chosen. */
  readonly closed = output<void>();
}
