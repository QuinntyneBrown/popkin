import { Injectable, signal } from '@angular/core';
import { ToastVariant } from 'components';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  heading: string;
  text?: string;
}

/**
 * Shows a toast for an action that succeeded without a visible change. Success and info leave
 * after 8 seconds; a failure stays until dismissed (L2-056 AC7).
 */
@Injectable({ providedIn: 'root' })
export class Toaster {
  private next = 0;
  private readonly state = signal<ToastMessage[]>([]);

  readonly toasts = this.state.asReadonly();

  show(variant: ToastVariant, heading: string, text?: string): void {
    const id = ++this.next;
    this.state.update((toasts) => [...toasts, { id, variant, heading, text }]);
    if (variant === 'success' || variant === 'info') {
      setTimeout(() => this.dismiss(id), 8_000);
    }
  }

  dismiss(id: number): void {
    this.state.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
