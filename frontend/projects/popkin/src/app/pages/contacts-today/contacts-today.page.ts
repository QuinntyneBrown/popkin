import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ContactsFrame,
  FollowUpView,
  SessionStore,
  TodayStore,
  comingUpDays,
  dateLine,
  dateTitle,
  driftingChip,
  driftingLine,
  dueText,
  greeting,
  habitRhythmLabel,
  habitTitle,
  longDay,
  lovesLine,
  overdueLine,
  parseDay,
  possessive,
  readyToImportLine,
  recentTitle,
  recentWhen,
  spotlightSub,
  spotlightWhen,
  todayDue,
} from 'api';
import {
  AppScreen,
  Avatar,
  Button,
  ContactsGrid,
  ContactsPage,
  ContactsStart,
  DateList,
  DriftChip,
  Drift,
  DriftChips,
  EmptyState,
  Icon,
  Link,
  ListHead,
  PageHead,
  PopkinNav,
  RecentItem,
  RecentList,
  Skeleton,
  Spotlight,
  SpotlightFact,
  Task,
  TodayDateItem,
  TodayDates,
} from 'components';
import { ImportContactsDialog } from '../../dialogs/import-contacts/import-contacts.dialog';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Today (L2-125), the first Contacts page: the greeting and the device's day, the next date that
 * matters, what is coming up, what to do today, what was logged lately and who has drifted; with
 * nobody in Contacts, the way to start (L2-125 AC8).
 */
@Component({
  selector: 'pk-contacts-today-page',
  imports: [
    AppScreen,
    Avatar,
    Button,
    ContactsGrid,
    ContactsPage,
    ContactsStart,
    DateList,
    Drift,
    DriftChips,
    EmptyState,
    Icon,
    Link,
    ListHead,
    PageHead,
    PopkinNav,
    RecentList,
    RouterLink,
    Skeleton,
    Spotlight,
    Task,
    TodayDates,
  ],
  providers: [TodayStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-today.page.html',
})
export class ContactsTodayPage implements OnInit {
  protected readonly frame = inject(ContactsFrame);
  protected readonly store = inject(TodayStore);
  private readonly session = inject(SessionStore).session;
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly heading = computed(() => greeting(this.session()?.name ?? '', this.now));
  protected readonly day = longDay(this.now);
  protected readonly empty = computed(
    () =>
      this.frame.people() === 0 ||
      (this.store.state() === 'ready' && this.store.today()?.people === 0),
  );
  protected readonly ready = computed(() => this.store.state() === 'ready' && !this.empty());
  protected readonly importLine = computed(() =>
    this.store.readyToImport() > 0 ? readyToImportLine(this.store.readyToImport()) : undefined,
  );

  protected readonly spotlight = computed(() => {
    const next = this.store.today()?.next;
    if (!next) return null;
    const d = next.date;
    const facts: SpotlightFact[] = [];
    const loves = lovesLine(next.loves);
    if (loves) facts.push({ icon: 'gift', lead: `${d.firstName} is into`, text: loves });
    if (next.lastTime) facts.push({ icon: 'heart', lead: 'Last time:', text: next.lastTime });
    return {
      when: spotlightWhen(d),
      heading: dateTitle(d),
      sub: spotlightSub(dateLine(d), next.knownAs),
      facts,
      face: { initials: d.initials, accent: d.accent.toLowerCase(), photo: d.photoUrl },
      profile: ['/contacts/people', d.contactId],
      profileLabel: `${possessive(d.firstName)} profile`,
      message: next.phone ? `sms:${next.phone.replace(/[^+\d]/g, '')}` : null,
      messageLabel: `Message ${d.firstName}`,
    };
  });

  protected readonly comingUp = computed<TodayDateItem[]>(() =>
    (this.store.today()?.comingUp ?? []).map((d) => {
      const on = parseDay(d.occursOn);
      return {
        top: MONTHS[on.getMonth()],
        day: `${on.getDate()}`,
        faces: [{ initials: d.initials, accent: d.accent.toLowerCase(), photo: d.photoUrl }],
        who: d.firstName,
        title: dateTitle(d),
        line: dateLine(d),
        days: comingUpDays(d.daysLeft),
        link: ['/contacts/people', d.contactId],
      };
    }),
  );

  protected readonly followUps = computed(() =>
    (this.store.today()?.followUps ?? []).map((f) => {
      const due = dueText(f.dueOn, this.now) ?? '';
      return {
        followUp: f,
        note: todayDue(due, f.isPromise),
        late: due.endsWith('late'),
        done: this.store.done().has(f.id),
      };
    }),
  );

  protected readonly habits = computed(() =>
    (this.store.today()?.overdueHabits ?? []).map((h) => ({
      id: h.id,
      text: `${habitTitle(h.what, h.contactFirstName)} is overdue`,
      note: overdueLine(habitRhythmLabel(h.rhythm), h.lastTime),
      call: h.contactPhone ? `tel:${h.contactPhone.replace(/[^+\d]/g, '')}` : null,
    })),
  );

  protected readonly toDo = computed(() => this.followUps().length + this.habits().length > 0);

  protected readonly recently = computed<RecentItem[]>(() =>
    (this.store.today()?.recently ?? []).map((e) => ({
      face: { initials: e.initials, accent: e.accent.toLowerCase(), photoUrl: e.photoUrl },
      kind: e.kind === 'Milestone' ? 'milestone' : 'conversation',
      title: recentTitle(e),
      note: e.note ?? undefined,
      when: recentWhen(e),
      link: ['/contacts/people', e.contactId],
    })),
  );

  protected readonly drifting = computed(() => this.store.today()?.drifting ?? []);
  protected readonly driftLine = computed(() => driftingLine(this.drifting()));
  protected readonly driftChips = computed<DriftChip[]>(() =>
    this.drifting().map((p) => ({
      face: { initials: p.initials, accent: p.accent.toLowerCase(), photoUrl: p.photoUrl },
      label: driftingChip(p),
      link: ['/contacts/people', p.contactId, 'log'],
    })),
  );

  ngOnInit(): void {
    if (this.frame.people() === 0) this.store.openEmpty();
    else this.store.open(this.now);
  }

  protected toggle(followUp: FollowUpView): void {
    this.store.toggle(followUp);
  }

  /** "Import from your Popkins" (L2-151): once some are imported, People shows them. */
  protected importPeople(): void {
    this.dialog
      .open<number>(ImportContactsDialog, { ariaLabelledBy: 'dlg-title' })
      .closed.subscribe((imported) => {
        if (!imported) return;
        this.frame.refresh();
        void this.router.navigateByUrl('/contacts/people');
      });
  }
}
