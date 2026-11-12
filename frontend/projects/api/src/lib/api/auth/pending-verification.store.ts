import { Injectable, signal } from '@angular/core';
import { CodePurpose, CodeSentView } from '../../models/auth';
import { ContactChannel } from './contact-rules';

/**
 * Carries a sent code from the sign-up or sign-in screen to the code screen. In memory only, so
 * no phone number, email or name is written to browser storage (L2-054).
 */
export interface PendingVerificationView extends CodeSentView {
  purpose: CodePurpose;
  /** The channel as the screen that sent the code names it. */
  contactChannel: ContactChannel;
  /** What the person typed, so "Use a different number" can bring it back. */
  contact: string;
  name?: string;
  returnUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class PendingVerificationStore {
  private readonly state = signal<PendingVerificationView | null>(null);

  readonly pending = this.state.asReadonly();

  set(value: PendingVerificationView): void {
    this.state.set(value);
  }

  /** A new code replaced the earlier one (L2-005 AC2). */
  resent(sent: CodeSentView): void {
    this.state.update((current) => (current ? { ...current, ...sent } : current));
  }

  clear(): void {
    this.state.set(null);
  }
}
