import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactAddedStore, NOT_FOUND_TEXT, addedHeading, addedLine, failedText } from 'api';
import { AvatarTick, Button, Card, EmptyState, Screen } from 'components';

/**
 * Added (L2-180, L2-181): the contact Quick Add just kept, with more about them now or later,
 * the next person, or done.
 */
@Component({
  selector: 'pk-contact-added-page',
  imports: [AvatarTick, Button, Card, EmptyState, RouterLink, Screen],
  providers: [ContactAddedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-added.page.html',
})
export class ContactAddedPage {
  /** From `/contacts/people/:contactId/added`. */
  readonly contactId = input.required<string>();
  protected readonly store = inject(ContactAddedStore);
  protected readonly notFound = NOT_FOUND_TEXT;
  protected readonly unread = failedText(null);
  protected readonly heading = computed(() => {
    const contact = this.store.contact();
    return contact ? addedHeading(contact.firstName) : '';
  });
  protected readonly line = computed(() => {
    const contact = this.store.contact();
    return contact ? addedLine(contact.circle, contact.knownAs) : '';
  });
  private readonly headingRef = viewChild<ElementRef<HTMLElement>>('headingEl');

  constructor() {
    effect(() => this.store.open(this.contactId()));
    // The heading takes focus as Added shows, so a screen reader says it.
    effect(() => this.headingRef()?.nativeElement.focus());
  }
}
