import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBrand } from '../admin-brand/admin-brand';
import { AdminNav, AdminNavMe, AdminNavSection } from '../admin-nav/admin-nav';
import { EnvTag } from '../env-tag/env-tag';
import { IconButton } from '../icon-button/icon-button';

/**
 * Admin shell (docs/design-system/components/admin-shell.html): the console's frame. From
 * 1024 px the navigation is a sidebar; below it a bar with "Open menu", the brand and the
 * deployment. A notice, such as the Viewer's, runs above the page, which is projected into
 * `main` (`id="main"`, the skip link's target).
 */
@Component({
  selector: 'div[pk-admin-shell]',
  imports: [AdminBrand, AdminNav, EnvTag, IconButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  host: { class: 'admin-shell' },
})
export class AdminShell {
  readonly sections = input.required<readonly AdminNavSection[]>();
  readonly current = input<string>();
  readonly me = input<AdminNavMe | null>(null);
  readonly label = input.required<string>();
  readonly notice = input<string | null>(null);

  readonly signOut = output<void>();
  readonly openMenu = output<void>();
}
