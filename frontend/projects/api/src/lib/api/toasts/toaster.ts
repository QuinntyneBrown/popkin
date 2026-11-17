import { Injectable, signal } from '@angular/core';

/** The kinds of toast, as `pk-toast` draws them. */
export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  heading: string;
  text?: string;
  /** What the toast offers to do: its label, and what choosing it does. */
  action?: ToastAction;
  /** Called once it is dismissed or acted on. */
  dismissed?: () => void;
}

export interface ToastOptions {
  /** An info toast that stays until dismissed, as a reminder does (L2-140 AC1). */
  lasting?: boolean;
  dismissed?: () => void;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

/** How long a success or info toast stays, counted again from when it is let go. */
const SHOWN_MS = 8_000;

/**
 * Shows a toast for an action that succeeded without a visible change. Success and info leave
 * after 8 seconds, waiting while the toast is hovered or focused; a failure stays until
 * dismissed (L2-056 AC7, L2-124 AC2, AC3).
 */
@Injectable({ providedIn: 'root' })
export class Toaster {
  private next = 0;
  private readonly state = signal<ToastMessage[]>([]);
  /** The toasts that leave on their own, by id, with their timer; null while held. */
  private readonly timers = new Map<number, ReturnType<typeof setTimeout> | null>();

  readonly toasts = this.state.asReadonly();

  show(
    variant: ToastVariant,
    heading: string,
    text?: string,
    action?: ToastAction,
    options: ToastOptions = {},
  ): void {
    const id = ++this.next;
    this.state.update((toasts) => [
      ...toasts,
      { id, variant, heading, text, action, dismissed: options.dismissed },
    ]);
    if ((variant === 'success' || variant === 'info') && !options.lasting) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), SHOWN_MS),
      );
    }
  }

  /** The toast is hovered or focused: it waits (L2-124 AC2). */
  hold(id: number): void {
    if (!this.timers.has(id)) return;
    clearTimeout(this.timers.get(id) ?? undefined);
    this.timers.set(id, null);
  }

  /** The toast is let go: it leaves 8 seconds later. */
  release(id: number): void {
    if (!this.timers.has(id)) return;
    clearTimeout(this.timers.get(id) ?? undefined);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), SHOWN_MS),
    );
  }

  /** The toast's action was chosen: it is done, and the toast goes. */
  act(toast: ToastMessage): void {
    this.dismiss(toast.id);
    toast.action?.run();
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id) ?? undefined);
    this.timers.delete(id);
    const toast = this.state().find((shown) => shown.id === id);
    this.state.update((toasts) => toasts.filter((shown) => shown.id !== id));
    toast?.dismissed?.();
  }
}
