import { AdminWaiting } from '../../../models/admin';
import { withoutNextYearLabel } from '../platform/holidays-text';

/** A section of the console, in the sidebar and the drawer (L2-089 AC1). */
export interface AdminNavItem {
  label: string;
  route: string;
  /** The `page` of the section's route, which marks it current. */
  page: string;
  /** An icon of the `components` library. */
  icon: 'shield' | 'scroll' | 'toggle' | 'bell' | 'sliders' | 'calendar';
  /** The count of `GET /api/admin/waiting` shown beside it, when above zero. */
  waiting?: keyof AdminWaiting;
  /** The count's name, "{n} waiting" when not given. */
  waitingLabel?: (n: number) => string;
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
    items: [
      { label: 'Features', route: '/features', page: 'features', icon: 'toggle' },
      { label: 'Notifications', route: '/notifications', page: 'notifications', icon: 'bell' },
      {
        label: 'Holiday calendars',
        route: '/holidays',
        page: 'holidays',
        icon: 'calendar',
        waiting: 'holidayCalendars',
        waitingLabel: withoutNextYearLabel,
      },
      { label: 'Limits', route: '/limits', page: 'limits', icon: 'sliders' },
    ],
  },
  {
    label: 'Access',
    items: [
      { label: 'Admins & roles', route: '/admins', page: 'admins', icon: 'shield' },
      { label: 'Audit log', route: '/audit', page: 'audit', icon: 'scroll' },
    ],
  },
];
