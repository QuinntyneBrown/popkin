import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AUTH_API,
  ContactChannel,
  PendingVerificationStore,
  contactProblem,
  nameProblem,
  safeReturnUrl,
  toApiProblem,
  tryAgainIn,
} from 'api';
import {
  Alert,
  Button,
  FormProblem,
  FormSummary,
  Legal,
  Screen,
  SegmentedControl,
  SegmentedOption,
  TextField,
  TopBar,
} from 'components';

/** Sign up with a name and a phone number or an email (L2-003). */
@Component({
  selector: 'pk-sign-up-page',
  imports: [
    Alert,
    Button,
    FormSummary,
    Legal,
    ReactiveFormsModule,
    Screen,
    SegmentedControl,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-up.page.html',
})
export class SignUpPage {
  protected readonly channels: SegmentedOption<ContactChannel>[] = [
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
  ];

  protected readonly name = new FormControl('', { nonNullable: true });
  protected readonly contact = new FormControl('', { nonNullable: true });
  protected readonly channel = signal<ContactChannel>('phone');

  protected readonly nameError = signal<string | null>(null);
  protected readonly contactError = signal<string | null>(null);
  protected readonly problems = signal<FormProblem[]>([]);

  protected readonly contactLabel = computed(() =>
    this.channel() === 'phone' ? 'Phone number' : 'Email',
  );

  /** `sending` while the request is in flight; `failed` and `limited` show the alert. */
  protected readonly status = signal<'idle' | 'sending' | 'failed' | 'limited'>('idle');
  protected readonly tryAgain = signal('');

  private readonly summary = viewChild(FormSummary);
  private readonly auth = inject(AUTH_API);
  private readonly pending = inject(PendingVerificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // "Use a different number" comes back here with what was typed (L2-003 AC8 keeps it too).
    const earlier = this.pending.pending();
    if (earlier?.purpose === 'SignUp') {
      this.name.setValue(earlier.name ?? '');
      this.channel.set(earlier.contactChannel);
      this.contact.setValue(earlier.contact);
    }
  }

  protected switchChannel(channel: string): void {
    this.channel.set(channel as ContactChannel);
    this.contact.setValue('');
    this.contactError.set(null);
    this.problems.update((problems) => problems.filter((p) => p.fieldId !== 'contact'));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const nameError = nameProblem(this.name.value);
    const contactError = contactProblem(this.channel(), this.contact.value);
    this.nameError.set(nameError);
    this.contactError.set(contactError);
    const problems: FormProblem[] = [];
    if (nameError) problems.push({ fieldId: 'name', message: `Your name: ${lower(nameError)}` });
    if (contactError) {
      problems.push({
        fieldId: 'contact',
        message: `${this.contactLabel()}: ${lower(contactError)}`,
      });
    }
    this.problems.set(problems);
    if (problems.length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }
    if (this.status() === 'sending') return;
    this.send();
  }

  private send(): void {
    this.status.set('sending');
    const contactChannel = this.channel();
    const contact = this.contact.value;
    this.auth
      .requestCode({
        purpose: 'SignUp',
        channel: contactChannel === 'phone' ? 'Phone' : 'Email',
        destination: contact,
      })
      .subscribe({
        next: (sent) => {
          this.pending.set({
            ...sent,
            purpose: 'SignUp',
            contactChannel,
            contact,
            name: this.name.value.trim(),
            returnUrl:
              safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ?? undefined,
          });
          void this.router.navigateByUrl('/verify');
        },
        error: (error: unknown) => {
          const problem = toApiProblem(error);
          if (problem.status === 400 && problem.field === 'destination') {
            this.status.set('idle');
            this.contactError.set(
              contactChannel === 'phone'
                ? 'That number looks a digit short.'
                : 'That email doesn’t look quite right.',
            );
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

function lower(message: string): string {
  return message.charAt(0).toLowerCase() + message.slice(1);
}
