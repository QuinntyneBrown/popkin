import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AUTH_API,
  PendingVerificationStore,
  parseContact,
  safeReturnUrl,
  toApiProblem,
  tryAgainIn,
} from 'api';
import { Alert, Button, Link, Screen, SplitAside, TextField, TopBar } from 'components';

/** Sign in with the phone number or email of an account and a new code (L2-006). */
@Component({
  selector: 'pk-sign-in-page',
  imports: [
    Alert,
    Button,
    Link,
    ReactiveFormsModule,
    RouterLink,
    Screen,
    SplitAside,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  private readonly auth = inject(AUTH_API);
  private readonly pending = inject(PendingVerificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly field = viewChild.required(TextField);

  protected readonly contact = new FormControl('', { nonNullable: true });
  protected readonly contactError = signal<string | null>(null);
  /** `sending` while the request is in flight; `failed` and `limited` show the alert. */
  protected readonly status = signal<'idle' | 'sending' | 'failed' | 'limited'>('idle');
  protected readonly tryAgain = signal('');

  /** The screen that was asked for, carried to the code screen and to sign up (L2-007 AC2). */
  protected readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  constructor() {
    // "Use a different number" comes back here with what was typed.
    const earlier = this.pending.pending();
    if (earlier?.purpose === 'SignIn') this.contact.setValue(earlier.contact);
    afterNextRender(() => this.field().focus());
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.status() === 'sending') return;
    const typed = parseContact(this.contact.value);
    this.contactError.set(typed.error);
    if (typed.error) {
      this.field().focus();
      return;
    }
    this.status.set('sending');
    this.auth
      .requestCode({ purpose: 'SignIn', channel: typed.channel, destination: typed.destination })
      .subscribe({
        next: (sent) => {
          this.pending.set({
            ...sent,
            purpose: 'SignIn',
            contactChannel: typed.channel === 'Phone' ? 'phone' : 'email',
            contact: typed.destination,
            returnUrl: this.returnUrl ?? undefined,
          });
          void this.router.navigateByUrl('/verify');
        },
        error: (error: unknown) => {
          const problem = toApiProblem(error);
          if (problem.status === 400 && problem.field === 'destination') {
            this.status.set('idle');
            this.contactError.set(
              typed.channel === 'Phone'
                ? 'That number looks a digit short.'
                : 'That email doesn’t look quite right.',
            );
            this.field().focus();
            return;
          }
          if (problem.status === 429) {
            this.tryAgain.set(tryAgainIn(problem.retryAfterSeconds));
            this.status.set('limited');
            return;
          }
          this.status.set('failed');
        },
      });
  }
}
