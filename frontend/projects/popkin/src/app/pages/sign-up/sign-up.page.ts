import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ContactChannel, contactProblem, nameProblem } from 'api';
import {
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

  private readonly summary = viewChild(FormSummary);

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
    }
  }
}

function lower(message: string): string {
  return message.charAt(0).toLowerCase() + message.slice(1);
}
