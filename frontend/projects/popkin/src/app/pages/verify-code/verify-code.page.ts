import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AUTH_API,
  PendingVerificationStore,
  SessionStore,
  nameProblem,
  toApiProblem,
  tryAgainIn,
} from 'api';
import { Button, Link, Screen, SplitAside, TextField, TopBar } from 'components';
import { Toaster } from '../../toasts/toaster';

const CODE_LENGTH = 6;

/** Confirm the six-digit code (L2-004) and send a new one (L2-005). */
@Component({
  selector: 'pk-verify-code-page',
  imports: [Button, Link, ReactiveFormsModule, RouterLink, Screen, SplitAside, TextField, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-code.page.html',
})
export class VerifyCodePage {
  private readonly auth = inject(AUTH_API);
  private readonly store = inject(PendingVerificationStore);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);

  protected readonly pending = this.store.pending;
  protected readonly code = new FormControl('', { nonNullable: true });
  protected readonly status = signal<'idle' | 'checking'>('idle');
  /** `name` once the code was right and no account has the number or email (L2-006 AC2). */
  protected readonly step = signal<'code' | 'name'>('code');
  protected readonly name = new FormControl('', { nonNullable: true });
  protected readonly nameError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  /** After an expired, used or exhausted code, a new code may be asked for at once. */
  protected readonly needsNewCode = signal(false);
  protected readonly resending = signal(false);
  private readonly now = signal(Date.now());

  protected readonly startedOn = computed(() =>
    this.pending()?.purpose === 'SignIn' ? '/sign-in' : '/sign-up',
  );
  protected readonly sentTo = computed(() => {
    const pending = this.pending();
    if (!pending) return '';
    const verb = pending.channel === 'Phone' ? 'texted' : 'emailed';
    return `We ${verb} 6 digits to ${pending.displayDestination}.`;
  });
  /** Back to sign in keeps the screen that was asked for (L2-007 AC2). */
  protected readonly startedOnParams = computed(() => {
    const pending = this.pending();
    return pending?.purpose === 'SignIn' && pending.returnUrl
      ? { returnUrl: pending.returnUrl }
      : null;
  });
  protected readonly differentLabel = computed(() =>
    this.pending()?.channel === 'Email' ? 'Use a different email' : 'Use a different number',
  );
  private readonly secondsLeft = computed(() => {
    const pending = this.pending();
    if (!pending) return 0;
    return Math.max(0, Math.ceil((Date.parse(pending.resendAvailableAt) - this.now()) / 1000));
  });
  protected readonly canResend = computed(
    () => !this.resending() && (this.needsNewCode() || this.secondsLeft() === 0),
  );
  protected readonly resendLabel = computed(() => {
    if (this.canResend() || this.resending()) return 'Send a new code';
    const seconds = this.secondsLeft();
    return `Send a new code in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  private readonly field = viewChild<TextField>('codeField');
  private readonly nameField = viewChild<TextField>('nameField');

  constructor() {
    if (!this.pending()) {
      void this.router.navigateByUrl('/sign-in', { replaceUrl: true });
      return;
    }
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    setTimeout(() => this.field()?.focus());
  }

  /**
   * Every way six digits arrive raises `input`: typing, pasting and one-time-code fill. The field
   * has already dropped anything that is not a digit.
   */
  protected changed(value: string): void {
    if (value.length === CODE_LENGTH) this.confirm();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.code.value.length === CODE_LENGTH) this.confirm();
  }

  /** The name step: the same code is confirmed again, with the name (L2-006 AC2). */
  protected submitName(event: Event): void {
    event.preventDefault();
    const problem = nameProblem(this.name.value);
    this.nameError.set(problem);
    if (problem) {
      this.nameField()?.focus();
      return;
    }
    this.confirm(this.name.value.trim());
  }

  private confirm(name?: string): void {
    const pending = this.pending();
    if (!pending || this.status() === 'checking') return;
    this.status.set('checking');
    const called = name ?? pending.name;
    this.auth.confirmCode(pending.verificationId, this.code.value, called).subscribe({
      next: (result) => {
        if (result.outcome === 'NameRequired' && !called) {
          this.status.set('idle');
          this.step.set('name');
          setTimeout(() => this.nameField()?.focus());
          return;
        }
        if (result.outcome !== 'SignedIn' || !result.session) {
          this.fail('We couldn’t check your code. Try again.');
          return;
        }
        this.sessions.set(result.session);
        this.store.clear();
        const next = pending.returnUrl ?? (pending.purpose === 'SignUp' ? '/new' : '/popkins');
        void this.router.navigateByUrl(next);
      },
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        switch (problem.code) {
          case 'code_mismatch': {
            const left = Number(problem.extensions['attemptsLeft']);
            const tries = left === 1 ? '1 try left.' : `${left} tries left.`;
            this.fail(`That code doesn’t match. Try again. ${tries}`);
            break;
          }
          case 'code_expired':
            this.fail('That code has expired.', true);
            break;
          case 'code_attempts_exhausted':
            this.fail('Too many tries. Send a new code to try again.', true);
            break;
          case 'code_used':
            this.fail('That code has been used. Send a new code.', true);
            break;
          default:
            this.fail('We couldn’t check your code. Try again.');
        }
      },
    });
  }

  private fail(message: string, needsNewCode = false): void {
    this.status.set('idle');
    this.step.set('code');
    this.code.setValue('');
    this.error.set(message);
    this.needsNewCode.set(needsNewCode);
    setTimeout(() => this.field()?.focus());
  }

  protected resend(): void {
    const pending = this.pending();
    if (!pending || !this.canResend()) return;
    this.resending.set(true);
    this.auth.resendCode(pending.verificationId).subscribe({
      next: (sent) => {
        this.store.resent(sent);
        this.now.set(Date.now());
        this.resending.set(false);
        this.needsNewCode.set(false);
        this.error.set(null);
        this.code.setValue('');
        const where = sent.channel === 'Phone' ? 'messages' : 'email';
        this.toaster.show('success', 'New code sent', `Check your ${where} for the 6 digits.`);
        this.field()?.focus();
      },
      error: (error: unknown) => {
        this.resending.set(false);
        const problem = toApiProblem(error);
        if (problem.status === 429) {
          this.error.set(`That’s a lot of codes. ${tryAgainIn(problem.retryAfterSeconds)}`);
        } else {
          this.error.set('We couldn’t send a new code. Check your connection and try again.');
        }
      },
    });
  }
}
