import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSignInStore, safeReturnUrl } from 'api';
import { AdminEntry, Alert, Button, Icon, Link, Stack, TextField } from 'components';
import { filter } from 'rxjs';

/** Admin sign in (L2-088): a staff email, then the six-digit code sent to it. */
@Component({
  selector: 'pk-sign-in-page',
  imports: [AdminEntry, Alert, Button, Icon, Link, ReactiveFormsModule, Stack, TextField],
  providers: [AdminSignInStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  protected readonly store = inject(AdminSignInStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly emailField = viewChild<TextField>('emailField');
  private readonly codeField = viewChild<TextField>('codeField');

  protected readonly email = new FormControl('', { nonNullable: true });
  protected readonly code = new FormControl('', { nonNullable: true });

  protected readonly sending = computed(() => this.store.status() === 'sending');
  protected readonly checking = computed(() => this.store.status() === 'checking');
  protected readonly locked = computed(() => this.store.status() === 'locked');

  /** The page that was asked for, opened after sign-in (L2-088 AC4). */
  private readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  constructor() {
    // Each step starts in its field.
    effect(() => {
      const step = this.store.step();
      afterNextRender(() => (step === 'email' ? this.emailField() : this.codeField())?.focus(), {
        injector: this.injector,
      });
    });
    effect(() => {
      if (this.locked()) this.code.disable();
      else this.code.enable();
    });
    // Six digits are checked as soon as they are entered, typed, pasted or filled in.
    this.code.valueChanges
      .pipe(
        filter((value) => /^\d{6}$/.test(value)),
        takeUntilDestroyed(),
      )
      .subscribe((value) => void this.check(value));
  }

  protected send(event: Event): void {
    event.preventDefault();
    this.store.sendCode(this.email.value);
    if (this.store.emailProblem()) this.emailField()?.focus();
  }

  protected submitCode(event: Event): void {
    event.preventDefault();
    void this.check(this.code.value);
  }

  protected useAnotherEmail(): void {
    this.code.setValue('', { emitEvent: false });
    this.store.useAnotherEmail();
  }

  protected goToEmail(event: Event): void {
    event.preventDefault();
    this.emailField()?.focus();
  }

  private async check(code: string): Promise<void> {
    const outcome = await this.store.confirm(code.trim());
    if (outcome === 'signed-in') await this.router.navigateByUrl(this.returnUrl ?? '/');
    if (outcome === 'not-an-admin') await this.router.navigateByUrl('/not-an-admin');
    if (outcome === null && this.store.codeError()) this.codeField()?.focus();
  }
}
