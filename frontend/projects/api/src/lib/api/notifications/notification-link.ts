/** The tabs of the Notifications screen a footer link can open. */
export type NotificationTab = 'types' | 'popkins' | 'people';

/** What a footer link asks the Notifications screen to do (unsubscribe design, "Footer links"). */
export interface NotificationLinkIntent {
  tab: NotificationTab;
  /** "Mute {Popkin}" or "Stop birthday reminders for {name}": the one change to apply. */
  mute?: { popkinId: string } | { keyDateId: string };
}

/** Anything that reads query parameters by name, as Angular's `ParamMap` does. */
export interface QueryParams {
  get(name: string): string | null;
}

const TABS: readonly NotificationTab[] = ['types', 'popkins', 'people'];
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The link intent of `/account/notifications?…` (L2-168 AC1, AC2). An unknown tab opens "What
 * you hear about"; a malformed id, or one on a tab that does not hold it, changes nothing.
 */
export function parseNotificationLink(query: QueryParams): NotificationLinkIntent {
  const asked = query.get('tab') as NotificationTab | null;
  const tab = asked && TABS.includes(asked) ? asked : 'types';
  const popkinId = query.get('mute');
  if (tab === 'popkins' && popkinId && ID.test(popkinId)) return { tab, mute: { popkinId } };
  const keyDateId = query.get('stop-birthday');
  if (tab === 'people' && keyDateId && ID.test(keyDateId)) return { tab, mute: { keyDateId } };
  return { tab };
}
