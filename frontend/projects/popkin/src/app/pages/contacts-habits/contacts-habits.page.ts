import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ContactsFrame,
  HabitView,
  HabitsStore,
  habitDue,
  habitKeeping,
  habitLate,
  habitLoggedFor,
  habitNext,
  habitRhythmLabel,
  habitRun,
  habitSub,
  habitTitle,
  dialogConfig,
} from 'api';
import {
  AppScreen,
  Avatar,
  Button,
  ContactsGrid,
  ContactsPage,
  EmptyState,
  HabitList,
  HabitListItem,
  Icon,
  KeepStrip,
  PageHead,
  PopkinNav,
  Skeleton,
  Spotlight,
} from 'components';
import { NewHabitData, NewHabitDialog } from '../../dialogs/new-habit/new-habit.dialog';

/**
 * Habits (L2-143, L2-144): the habit overdue longest leads with "We met up"; the others are rows,
 * each opening the contact's profile. "New habit" asks who it is with.
 */
@Component({
  selector: 'pk-contacts-habits-page',
  imports: [
    AppScreen,
    Avatar,
    Button,
    ContactsGrid,
    ContactsPage,
    EmptyState,
    HabitList,
    Icon,
    KeepStrip,
    PageHead,
    PopkinNav,
    Skeleton,
    Spotlight,
  ],
  providers: [HabitsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-habits.page.html',
})
export class ContactsHabitsPage {
  protected readonly store = inject(HabitsStore);
  protected readonly frame = inject(ContactsFrame);
  private readonly dialog = inject(Dialog);

  protected readonly lead = computed(() => {
    const habit = this.store.leading();
    if (!habit) return null;
    const today = this.store.today();
    const logged = this.store.logged(habit.id);
    const keeping = habitKeeping(habit, today);
    const due = habitDue(habit.dueOn, today);
    return {
      habit,
      logged,
      heading: habitTitle(habit.what, habit.contactFirstName),
      sub: habitSub(habit.rhythm, keeping.kept, keeping.periods.length),
      when: logged
        ? habitLoggedFor(habit.rhythm)
        : due.state === 'overdue'
          ? habitLate(due.late)
          : 'Due today',
      late: !logged && due.state === 'overdue',
      accent: habit.contactAccent.toLowerCase(),
      periods: keeping.periods,
    };
  });

  protected readonly rows = computed(() =>
    this.store.rows().map((habit) => rowOf(habit, this.store.today())),
  );

  constructor() {
    this.store.open();
  }

  /** New habit, with anyone of mine who has none; Habits reads again once one starts (L2-145 AC3). */
  protected newHabit(): void {
    this.dialog
      .open<HabitView, NewHabitData>(
        NewHabitDialog,
        dialogConfig({
          data: {},
        }),
      )
      .closed.subscribe((started) => {
        if (started) this.store.open();
      });
  }
}

function rowOf(habit: HabitView, today: Date): HabitListItem {
  const keeping = habitKeeping(habit, today);
  return {
    id: habit.id,
    heading: habitTitle(habit.what, habit.contactFirstName),
    often: habitRhythmLabel(habit.rhythm),
    link: ['/contacts/people', habit.contactId],
    name: habit.contactName,
    photo: habit.contactPhotoUrl,
    initials: habit.contactInitials,
    accent: habit.contactAccent.toLowerCase(),
    periods: keeping.periods,
    streak: habitRun(keeping.run, habit.rhythm),
    next: habitNext(habit.dueOn, today),
  };
}
