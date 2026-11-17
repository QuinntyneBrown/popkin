import { parseNotificationLink } from './notification-link';

const POPKIN = '6f1c2a9e-3b4d-4e5f-8a7b-1c2d3e4f5a6b';
const KEY_DATE = '0a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d';

function query(params: Record<string, string>) {
  return { get: (name: string) => params[name] ?? null };
}

describe('parseNotificationLink', () => {
  // One case per row of the footer links table, then the edges.
  it('reads "Mute {Popkin}" as the Popkins tab and that Popkin muted', () => {
    expect(parseNotificationLink(query({ tab: 'popkins', mute: POPKIN }))).toEqual({
      tab: 'popkins',
      mute: { popkinId: POPKIN },
    });
  });

  it('reads "Mute a Popkin" as the Popkins tab and no change', () => {
    expect(parseNotificationLink(query({ tab: 'popkins' }))).toEqual({ tab: 'popkins' });
  });

  it('reads "Stop birthday reminders for {name}" as the People tab and that birthday', () => {
    expect(parseNotificationLink(query({ tab: 'people', 'stop-birthday': KEY_DATE }))).toEqual({
      tab: 'people',
      mute: { keyDateId: KEY_DATE },
    });
  });

  it('reads "Notification settings" as What you hear about', () => {
    expect(parseNotificationLink(query({ tab: 'types' }))).toEqual({ tab: 'types' });
  });

  it('opens What you hear about for an unknown tab', () => {
    expect(parseNotificationLink(query({ tab: 'trips', mute: POPKIN }))).toEqual({ tab: 'types' });
  });

  it('ignores a malformed id', () => {
    expect(parseNotificationLink(query({ tab: 'popkins', mute: 'lakeside' }))).toEqual({
      tab: 'popkins',
    });
  });

  it('ignores an id on a tab that does not hold it', () => {
    expect(parseNotificationLink(query({ tab: 'people', mute: POPKIN }))).toEqual({
      tab: 'people',
    });
  });

  it('opens What you hear about with no query', () => {
    expect(parseNotificationLink(query({}))).toEqual({ tab: 'types' });
  });
});
