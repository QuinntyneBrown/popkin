import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ContactProfileStore,
  ContactsFrame,
  NOT_FOUND_TEXT,
  NO_COUNTS,
  closestItem,
  failedText,
  kindIcon,
  leadLabel,
  profileDateLine,
  profileDateTitle,
  loadingLine,
  possessive,
  profileSub,
} from 'api';
import {
  AddCard,
  AppScreen,
  Avatar,
  BackLink,
  Button,
  ContactFact,
  ContactFacts,
  ContactId,
  ContactsGrid,
  ContactsPage,
  EmptyState,
  IconButton,
  KeyDateItem,
  KeyDates,
  Likes,
  Link,
  ListHead,
  PopkinNav,
  Skeleton,
  ViewLink,
  ViewNav,
} from 'components';
import {
  ContactAction,
  ContactActionsData,
  ContactActionsDialog,
} from '../../dialogs/contact-actions/contact-actions.dialog';
import {
  DeleteContactData,
  DeleteContactDialog,
} from '../../dialogs/delete-contact/delete-contact.dialog';
import { AddDateData, AddDateDialog } from '../../dialogs/add-date/add-date.dialog';

type HistoryView = 'timeline' | 'follow-ups' | 'memories';

const MODAL = { ariaLabelledBy: 'dlg-title', hasBackdrop: false, ariaModal: true } as const;

/**
 * A contact's profile (L2-128): who they are, how to reach them, what I know about them and
 * their history, with "More for {first name}" (L2-131). A contact not mine, or an address that
 * cannot name one, shows only the way back to People (L2-122 AC2).
 */
@Component({
  selector: 'pk-contact-profile-page',
  imports: [
    AddCard,
    AppScreen,
    Avatar,
    BackLink,
    Button,
    ContactFacts,
    ContactId,
    ContactsGrid,
    ContactsPage,
    EmptyState,
    IconButton,
    KeyDates,
    Likes,
    Link,
    ListHead,
    PopkinNav,
    RouterLink,
    Skeleton,
    ViewNav,
  ],
  providers: [ContactProfileStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-profile.page.html',
})
export class ContactProfilePage {
  /** From `/contacts/people/:contactId`. */
  readonly contactId = input.required<string>();
  /** The history tab, from `?view=` (the timeline when absent). */
  readonly view = input<string>();
  protected readonly store = inject(ContactProfileStore);
  protected readonly frame = inject(ContactsFrame);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  protected readonly notFound = NOT_FOUND_TEXT;

  /** The first name the opening screen passed, until the profile is read (known gap 111). */
  private readonly passedFirstName =
    (this.router.getCurrentNavigation()?.extras.state?.['firstName'] as string | undefined) ?? null;

  protected readonly profile = this.store.profile;
  protected readonly firstName = computed(
    () => this.profile()?.firstName ?? this.store.knownFirstName(),
  );
  protected readonly loading = computed(() => loadingLine(this.store.knownFirstName()));
  protected readonly failed = computed(() => failedText(this.store.knownFirstName()));
  protected readonly sub = computed(() => {
    const profile = this.profile();
    return profile ? profileSub(profile) : '';
  });
  protected readonly editLink = computed(() => `/contacts/people/${this.contactId()}/edit`);
  protected readonly logLink = computed(() => `/contacts/people/${this.contactId()}/log`);
  protected readonly facts = computed<ContactFact[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const facts: ContactFact[] = [];
    if (profile.phone) facts.push({ icon: 'call', label: 'Phone', value: profile.phone });
    if (profile.email) facts.push({ icon: 'mail', label: 'Email', value: profile.email });
    if (profile.city) facts.push({ icon: 'map-pin', label: 'City', value: profile.city });
    if (profile.howWeMet)
      facts.push({ icon: 'heart', label: 'How you met', value: profile.howWeMet });
    return facts;
  });
  /** Key dates, soonest first, the near ones with the days left (L2-128 AC4). */
  protected readonly keyDates = computed<KeyDateItem[]>(() => {
    const today = new Date();
    return (this.profile()?.keyDates ?? []).map((date) => ({
      icon: kindIcon(date.kind),
      title: profileDateTitle(date),
      when: profileDateLine(date, today),
      reminder: leadLabel(date.reminder),
    }));
  });
  protected readonly historyLabel = computed(() => `${possessive(this.firstName() ?? '')} history`);
  protected readonly current = computed<HistoryView>(() => {
    const view = this.view();
    return view === 'follow-ups' || view === 'memories' ? view : 'timeline';
  });
  protected readonly views = computed<ViewLink[]>(() => {
    const link = `/contacts/people/${this.contactId()}`;
    const current = this.current();
    return [
      { label: 'Timeline', link, current: current === 'timeline' },
      {
        label: 'Follow-ups',
        link,
        query: { view: 'follow-ups' },
        current: current === 'follow-ups',
      },
      {
        label: 'Memories & files',
        link,
        query: { view: 'memories' },
        current: current === 'memories',
      },
    ];
  });

  constructor() {
    effect(() => this.store.open(this.contactId(), this.passedFirstName));
  }

  /** Add a date for this contact; the profile reads again once it is kept (L2-138 AC4). */
  protected addDate(): void {
    this.dialog
      .open<unknown, AddDateData>(AddDateDialog, {
        data: { contactId: this.contactId() },
        ...MODAL,
      })
      .closed.subscribe((saved) => {
        if (saved) this.store.retry();
      });
  }

  /** "Delete {first name}?" (L2-132): once they are gone, People opens. */
  private delete(): void {
    const profile = this.profile();
    if (!profile) return;
    this.dialog
      .open<boolean, DeleteContactData>(DeleteContactDialog, {
        data: {
          accent: 'coral',
          contactId: profile.id,
          firstName: profile.firstName,
          counts: NO_COUNTS,
        },
        ...MODAL,
      })
      .closed.subscribe((deleted) => {
        if (deleted) void this.router.navigateByUrl('/contacts/people');
      });
  }

  /** "More for {first name}" (L2-131). */
  protected more(): void {
    const profile = this.profile();
    if (!profile) return;
    const opened = this.dialog.open<ContactAction, ContactActionsData>(ContactActionsDialog, {
      data: {
        accent: 'coral',
        name: profile.name,
        firstName: profile.firstName,
        closest: closestItem(profile),
      },
      ...MODAL,
    });
    opened.closed.subscribe((action) => {
      if (action === 'closest') {
        if (profile.isClosest) this.store.takeOutOfClosest();
        else this.store.addToClosest();
      }
      if (action === 'edit') void this.router.navigateByUrl(this.editLink());
      if (action === 'delete') this.delete();
      if (action === 'connections')
        void this.router.navigate(['/contacts/connections'], {
          queryParams: { contact: profile.id },
        });
    });
  }
}
