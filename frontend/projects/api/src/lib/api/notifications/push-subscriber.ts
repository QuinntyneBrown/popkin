import { DOCUMENT, InjectionToken, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NOTIFICATIONS_API, NotificationsApi } from './notifications-api';

/** What subscribing this device came to: on, refused by the person, or not possible here. */
export type PushOutcome = 'on' | 'blocked' | 'unsupported';

/** This device's phone alerts by Web Push (ADR 0028), for every kind of notification. */
export interface PushSubscriber {
  subscribe(): Promise<PushOutcome>;
  unsubscribe(): Promise<void>;
}

export const PUSH_WORKER = '/push-worker.js';

/** A VAPID key in URL-safe base64, as the Push API takes it. */
export function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Asks the browser's permission, registers the push worker and saves the subscription; turning
 * off removes it. Anything the browser cannot do answers "unsupported".
 */
export class BrowserPushSubscriber implements PushSubscriber {
  constructor(
    private readonly api: NotificationsApi,
    private readonly window: (Window & typeof globalThis) | null,
  ) {}

  async subscribe(): Promise<PushOutcome> {
    const w = this.window;
    if (
      !w ||
      !('Notification' in w) ||
      !('serviceWorker' in w.navigator) ||
      !('PushManager' in w)
    ) {
      return 'unsupported';
    }
    try {
      if ((await w.Notification.requestPermission()) !== 'granted') return 'blocked';
      const { publicKey } = await firstValueFrom(this.api.pushKey());
      if (!publicKey) return 'unsupported';
      const registration = await w.navigator.serviceWorker.register(PUSH_WORKER);
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        }));
      const keys = subscription.toJSON().keys ?? {};
      await firstValueFrom(
        this.api.savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: keys['p256dh'] ?? '',
          auth: keys['auth'] ?? '',
        }),
      );
      return 'on';
    } catch {
      return 'unsupported';
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const registration = await this.window?.navigator.serviceWorker?.getRegistration(PUSH_WORKER);
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await firstValueFrom(this.api.removePushSubscription(subscription.endpoint));
      await subscription.unsubscribe();
    } catch {
      // The device stays subscribed; a push it no longer wants is dropped by the push service.
    }
  }
}

export const PUSH_SUBSCRIBER = new InjectionToken<PushSubscriber>('PUSH_SUBSCRIBER', {
  providedIn: 'root',
  factory: () =>
    new BrowserPushSubscriber(
      inject(NOTIFICATIONS_API),
      inject(DOCUMENT).defaultView as (Window & typeof globalThis) | null,
    ),
});
