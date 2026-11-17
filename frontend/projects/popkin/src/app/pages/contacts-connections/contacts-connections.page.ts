import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CONNECTIONS_HINT,
  CONNECTIONS_LEGEND,
  ConnectionFilter,
  ConnectionsStore,
  ContactsFrame,
  dialogConfig,
} from 'api';
import {
  AppScreen,
  AroundItem,
  Button,
  ConnectionMap,
  ConnectionPanel,
  ContactsGrid,
  ContactsPage,
  EmptyState,
  FilterChipOption,
  FilterChips,
  Icon,
  PageHead,
  PeopleAround,
  PopkinNav,
  Skeleton,
} from 'components';
import {
  ConnectPersonData,
  ConnectPersonDialog,
  ConnectPersonResult,
} from '../../dialogs/connect-person/connect-person.dialog';

const FILTERS: readonly FilterChipOption<ConnectionFilter>[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'family', label: 'Family', key: 'family' },
  { value: 'friend', label: 'Friends', key: 'friend' },
  { value: 'work', label: 'Work', key: 'work' },
];

/**
 * Connections (L2-149, L2-150): the map of my contacts and how they know each other, with a panel
 * for the face chosen. "Connect" opens Connect for them, or for two people from the empty map.
 */
@Component({
  selector: 'pk-contacts-connections-page',
  imports: [
    AppScreen,
    Button,
    ConnectionMap,
    ConnectionPanel,
    ContactsGrid,
    ContactsPage,
    EmptyState,
    FilterChips,
    Icon,
    PageHead,
    PeopleAround,
    PopkinNav,
    RouterLink,
    Skeleton,
  ],
  providers: [ConnectionsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-connections.page.html',
})
export class ContactsConnectionsPage {
  protected readonly store = inject(ConnectionsStore);
  protected readonly frame = inject(ContactsFrame);
  private readonly dialog = inject(Dialog);

  protected readonly filters = FILTERS;
  protected readonly hint = CONNECTIONS_HINT;
  protected readonly legend = CONNECTIONS_LEGEND;

  protected readonly chosen = computed(() => {
    const person = this.store.chosen();
    return person
      ? {
          name: person.fullName,
          sub: person.knownAs ?? person.circle ?? '',
          initials: person.initials,
          photo: person.photoUrl,
          accent: person.accent.toLowerCase(),
        }
      : null;
  });

  protected readonly rows = computed<AroundItem[]>(() =>
    this.store.rows().map((row) => ({
      name: row.name,
      initials: row.initials,
      photo: row.photoUrl,
      accent: row.accent,
      kind: row.kind,
      meta: row.meta,
      link: row.contactId ? ['/contacts/people', row.contactId] : '/account',
    })),
  );

  constructor() {
    this.store.open(inject(ActivatedRoute).snapshot.queryParamMap.get('contact'));
  }

  /** "Connect" for the chosen face, or "Connect two people" from the empty map. */
  protected connect(): void {
    const person = this.store.chosen();
    this.dialog
      .open<ConnectPersonResult, ConnectPersonData>(
        ConnectPersonDialog,
        dialogConfig({
          data: person ? { contact: { id: person.contactId, firstName: person.firstName } } : {},
        }),
      )
      .closed.subscribe((result) => {
        if (result?.connection) this.store.connected();
      });
  }
}
