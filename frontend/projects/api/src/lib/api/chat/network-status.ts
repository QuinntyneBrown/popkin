import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, Signal, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/** Whether the device has a connection, as the browser reports it (L2-028 AC2, AC3). */
export interface NetworkStatus {
  readonly online: Signal<boolean>;
  /** Emits each time the connection returns. */
  readonly backOnline$: Observable<void>;
}

export const NETWORK_STATUS = new InjectionToken<NetworkStatus>('NetworkStatus');

@Injectable()
export class BrowserNetworkStatus implements NetworkStatus {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly state = signal(this.view?.navigator.onLine ?? true);
  private readonly returned = new Subject<void>();

  readonly online = this.state.asReadonly();
  readonly backOnline$ = this.returned.asObservable();

  constructor() {
    const view = this.view;
    if (!view) return;
    const offline = (): void => this.state.set(false);
    const online = (): void => {
      this.state.set(true);
      this.returned.next();
    };
    view.addEventListener('offline', offline);
    view.addEventListener('online', online);
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('offline', offline);
      view.removeEventListener('online', online);
    });
  }
}
