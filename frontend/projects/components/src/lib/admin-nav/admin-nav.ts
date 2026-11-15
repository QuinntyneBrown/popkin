import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBrand } from '../admin-brand/admin-brand';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { EnvTag } from '../env-tag/env-tag';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { IconButton } from '../icon-button/icon-button';

/** A section of the console: its label, address, icon and the `page` that marks it current. */
export interface AdminNavLink {
  label: string;
  route: string;
  page: string;
  icon: IconName;
  /** What waits there, counted beside it when above zero ("5 waiting"). */
  waiting?: number;
}

export interface AdminNavSection {
  label: string;
  items: readonly AdminNavLink[];
}

/** The signed-in admin at the foot of the navigation. */
export interface AdminNavMe {
  name: string;
  role: string;
}

/**
 * Admin navigation (docs/design-system/components/admin-shell.html): the brand and the
 * deployment, the sections in groups with the current one marked (`aria-current`), and the
 * signed-in admin with "Sign out". The console's sidebar and its drawer render the same one.
 */
@Component({
  selector: 'div[pk-admin-nav]',
  imports: [AdminBrand, Avatar, Badge, EnvTag, Icon, IconButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-nav.html',
  styleUrl: './admin-nav.scss',
})
export class AdminNav {
  readonly sections = input.required<readonly AdminNavSection[]>();
  /** The `page` of the section shown. */
  readonly current = input<string>();
  readonly me = input<AdminNavMe | null>(null);
  /** The deployment: "Production". */
  readonly label = input.required<string>();

  readonly signOut = output<void>();
  /** A section was followed; the drawer closes on it. */
  readonly chosen = output<void>();

  protected id(label: string): string {
    return `nav-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  }
}
