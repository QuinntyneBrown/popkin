import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { AdminCodeSent } from '../../../models/admin';
import { toApiProblem } from '../../problem';
import { ADMIN_AUTH_API } from './admin-auth-api';
import { AdminSessionStore } from './admin-session.store';
import { EmailProblem, emailProblem, lockedText, mismatchText } from './admin-sign-in-text';

/** What a confirmed code leads to; `null` when the code step stays open. */
export type AdminSignInOutcome = 'signed-in' | 'not-an-admin' | null;

/**
 * Admin sign in (docs/detailed-designs/admin-access/admin-sign-in): a staff email, then the code
 * sent to it. One route with two steps, as the mock's states share one. One per page.
 */
@Injectable()
export class AdminSignInStore {
  private readonly api = inject(ADMIN_AUTH_API);
  private readonly session = inject(AdminSessionStore);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  private resendTimer?: ReturnType<typeof setTimeout>;
  private sent?: AdminCodeSent;

  readonly step = signal<'email' | 'code'>('email');
  readonly status = signal<'idle' | 'sending' | 'checking' | 'locked'>('idle');
  /** What was typed, kept for "Use another email" (L2-088 AC7). */
  readonly email = signal('');
  readonly sentTo = signal('');
  readonly emailProblem = signal<EmailProblem | null>(null);
  /** The code could not be asked for: the network or the API failed. */
  readonly sendFailed = signal(false);
  readonly codeError = signal<string | null>(null);
  readonly lockedText = signal('');
  readonly canResend = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.resendTimer));
  }

  sendCode(typed: string): void {
    if (this.status() === 'sending') return;
    this.email.set(typed);
    const problem = emailProblem(typed);
    this.emailProblem.set(problem);
    this.sendFailed.set(false);
    if (problem) return;
    this.status.set('sending');
    this.api.requestCode(typed.trim()).subscribe({
      next: (sent) => {
        this.codeSent(sent);
        this.codeError.set(null);
        this.step.set('code');
        this.status.set('idle');
      },
      error: (error: unknown) => {
        const refused = toApiProblem(error);
        if (refused.code === 'admin_locked') {
          this.locked(refused.extensions['lockedUntil']);
          this.step.set('code');
          return;
        }
        this.status.set('idle');
        this.sendFailed.set(true);
      },
    });
  }

  /** Checks a code; resolves what it led to. A wrong or old code keeps the code step open. */
  async confirm(code: string): Promise<AdminSignInOutcome> {
    const sent = this.sent;
    if (!sent || this.status() !== 'idle') return null;
    this.status.set('checking');
    this.codeError.set(null);
    const answer = await firstValueFrom(
      this.api.confirm(sent.verificationId, code).pipe(
        map((me) => ({ me, error: null as unknown })),
        catchError((error: unknown) => of({ me: null, error })),
      ),
    );
    if (answer.me) {
      this.session.set(answer.me);
      return 'signed-in';
    }
    const refused = toApiProblem(answer.error);
    switch (refused.code) {
      case 'not_an_admin':
        this.status.set('idle');
        return 'not-an-admin';
      case 'admin_locked':
        this.locked(refused.extensions['lockedUntil']);
        return null;
      case 'code_mismatch': {
        const left = refused.extensions['attemptsLeft'];
        this.codeError.set(mismatchText(typeof left === 'number' ? left : 1));
        break;
      }
      case 'code_expired':
        this.codeError.set('That code has run out. Send a new code.');
        break;
      default:
        this.codeError.set('We couldn’t check your code. Try again.');
    }
    this.status.set('idle');
    return null;
  }

  resend(): void {
    const sent = this.sent;
    if (!sent || !this.canResend() || this.status() !== 'idle') return;
    this.canResend.set(false);
    this.api.resend(sent.verificationId).subscribe({
      next: (again) => {
        this.codeSent(again);
        this.codeError.set(null);
      },
      error: () => this.canResend.set(true),
    });
  }

  useAnotherEmail(): void {
    clearTimeout(this.resendTimer);
    this.sent = undefined;
    this.codeError.set(null);
    this.canResend.set(false);
    this.status.set('idle');
    this.step.set('email');
  }

  private codeSent(sent: AdminCodeSent): void {
    this.sent = sent;
    this.sentTo.set(sent.sentTo);
    clearTimeout(this.resendTimer);
    this.canResend.set(false);
    const wait = new Date(sent.resendAvailableAt).getTime() - Date.now();
    this.resendTimer = setTimeout(() => this.canResend.set(true), Math.max(0, wait));
  }

  private locked(until: unknown): void {
    clearTimeout(this.resendTimer);
    this.canResend.set(false);
    this.lockedText.set(lockedText(typeof until === 'string' ? until : undefined, this.timeZone));
    this.status.set('locked');
  }
}
