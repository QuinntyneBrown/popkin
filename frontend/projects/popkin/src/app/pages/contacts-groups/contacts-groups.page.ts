import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ContactRowView,
  ContactsFrame,
  GROUP_KIND_LABELS,
  GroupView,
  GroupsStore,
  dateTitle,
  groupPeople,
  howKnown,
  memberLastTalked,
  memberNames,
  openPopkin,
} from 'api';
import {
  AppScreen,
  Button,
  ComingUp,
  ComingUpItem,
  ContactsPage,
  EmptyState,
  GroupBrowser,
  GroupKind,
  GroupMemberItem,
  GroupMembers,
  Icon,
  InfoCard,
  InfoLine,
  ListHead,
  OpenGroup,
  PageHead,
  PopkinNav,
  Skeleton,
} from 'components';
import {
  GroupAddPeopleData,
  GroupAddPeopleDialog,
} from '../../dialogs/group-add-people/group-add-people.dialog';
import { NewGroupDialog } from '../../dialogs/new-group/new-group.dialog';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Groups (L2-146 to L2-148): the person's groups by kind, and the open one beside the list, or on
 * a phone in place of it with a back link. The open group is the address
 * `/contacts/groups/{groupId}` (known gap 108, ruled).
 */
@Component({
  selector: 'pk-contacts-groups-page',
  imports: [
    AppScreen,
    Button,
    ComingUp,
    ContactsPage,
    EmptyState,
    GroupBrowser,
    GroupMembers,
    Icon,
    InfoCard,
    InfoLine,
    ListHead,
    PageHead,
    PopkinNav,
    RouterLink,
    Skeleton,
  ],
  providers: [GroupsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-groups.page.html',
})
export class ContactsGroupsPage {
  protected readonly store = inject(GroupsStore);
  protected readonly frame = inject(ContactsFrame);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  /** The open group, from `/contacts/groups/{groupId}`. */
  readonly groupId = input<string>();

  protected readonly skeletons = [1, 2, 3, 4, 5];

  protected readonly kinds = computed<GroupKind[]>(() =>
    this.store.byKind().map((k) => ({
      kind: k.heading,
      groups: k.groups.map((g) => ({
        id: g.id,
        emoji: g.emoji,
        accent: g.accent.toLowerCase(),
        name: g.name,
        members: memberNames(g.members),
        link: ['/contacts/groups', g.id],
      })),
    })),
  );

  protected readonly open = computed<OpenGroup | null>(() => {
    const group = this.store.open();
    return group
      ? {
          kind: GROUP_KIND_LABELS[group.kind],
          name: group.name,
          emoji: group.emoji,
          accent: group.accent.toLowerCase(),
        }
      : null;
  });

  protected readonly members = computed<GroupMemberItem[]>(() =>
    (this.store.open()?.members ?? []).map((m) => ({
      name: m.fullName,
      initials: m.initials,
      photo: m.photoUrl,
      accent: m.accent.toLowerCase(),
      text: howKnown(m),
      meta: memberLastTalked(m),
      link: ['/contacts/people', m.contactId],
    })),
  );

  protected readonly comingUp = computed<ComingUpItem[]>(() =>
    (this.store.open()?.comingUp ?? []).map((d) => {
      const [, month, day] = d.occursOn.split('-').map(Number);
      return {
        who: { initials: d.initials, accent: d.accent.toLowerCase(), photo: d.photoUrl },
        title: dateTitle(d),
        day: `${MONTHS[month - 1]} ${day}`,
      };
    }),
  );

  protected readonly peopleHeading = computed(() =>
    groupPeople(this.store.open()?.members.length ?? 0),
  );

  protected readonly openLabel = computed(() => {
    const popkin = this.store.open()?.popkin;
    return popkin ? openPopkin(popkin.name) : '';
  });

  constructor() {
    this.store.load();
    effect(() => this.store.openId.set(this.groupId() ?? null));
  }

  /** "New group" (L2-147 AC1): once made, it opens. */
  protected newGroup(): void {
    this.dialog
      .open<GroupView>(NewGroupDialog, {
        ariaLabelledBy: 'dlg-title',
        hasBackdrop: false,
        ariaModal: true,
      })
      .closed.subscribe((group) => {
        if (!group) return;
        this.store.saved(group);
        void this.router.navigate(['/contacts/groups', group.id]);
      });
  }

  /** "Add people" (L2-147 AC3). */
  protected addPeople(group: GroupView): void {
    this.dialog
      .open<ContactRowView[], GroupAddPeopleData>(GroupAddPeopleDialog, {
        data: {
          groupId: group.id,
          name: group.name,
          members: group.members.map((m) => m.contactId),
        },
        ariaLabelledBy: 'add-people-title',
        hasBackdrop: false,
        ariaModal: true,
      })
      .closed.subscribe((added) => {
        if (added?.length) this.store.load();
      });
  }
}
