/** A section of the console, in the sidebar and the drawer (L2-089 AC1). */
export interface AdminNavItem {
  label: string;
  route: string;
  /** The `page` of the section's route, which marks it current. */
  page: string;
  /** An icon of the `components` library. */
  icon: 'shield' | 'scroll' | 'toggle';
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/**
 * The sections the console has so far. L2-089 AC1 names six groups and 18 items; each joins this
 * list in the journey that builds its page, so the sidebar never leads to a page not built yet.
 */
export const ADMIN_SECTIONS: readonly AdminNavGroup[] = [
  {
    label: 'Platform',
    items: [{ label: 'Features', route: '/features', page: 'features', icon: 'toggle' }],
  },
  {
    label: 'Access',
    items: [
      { label: 'Admins & roles', route: '/admins', page: 'admins', icon: 'shield' },
      { label: 'Audit log', route: '/audit', page: 'audit', icon: 'scroll' },
    ],
  },
];
