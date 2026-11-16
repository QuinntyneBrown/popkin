import { Injectable, computed, inject, signal } from '@angular/core';
import { HabitView } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { habitDue } from './habit-rules';
import { habitDueBy, habitTitle } from './habits-text';

export const HABIT_KEEP_FAILED_HEADING = 'We couldn’t log that';
export const HABIT_KEEP_FAILED_TEXT = 'Check your connection and try again.';

/**
 * Habits (docs/detailed-designs/contacts/habits): my running habits, the one overdue longest
 * leading as the page reads them (L2-143 AC2, AC7). "We met up" logs it at once on the device's
 * day; the toast says when the next is due and offers Undo (L2-144). The lead stays where it was
 * until Habits is read again, pressed for its period. Provided by the page.
 */
@Injectable()
export class HabitsStore {
  private readonly api = inject(CONTACTS_API);
  private readonly toaster = inject(Toaster);

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly habits = signal<HabitView[]>([]);
  /** The device's day, read when Habits is read. */
  readonly today = signal(new Date());
  private readonly leadId = signal<string | null>(null);
  private readonly loggedIds = signal<ReadonlySet<string>>(new Set());

  readonly empty = computed(() => this.state() === 'ready' && this.habits().length === 0);
  readonly leading = computed(() => this.habits().find((h) => h.id === this.leadId()) ?? null);
  readonly rows = computed(() => this.habits().filter((h) => h.id !== this.leadId()));

  open(): void {
    this.state.set('loading');
    this.today.set(new Date());
    this.api.habits().subscribe({
      next: (habits) => {
        const today = this.today();
        const overdue = habits
          .filter((h) => habitDue(h.dueOn, today).state === 'overdue')
          .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
        this.leadId.set(overdue[0]?.id ?? null);
        this.loggedIds.set(new Set());
        this.habits.set(
          [...habits].sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0)),
        );
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }

  /** "Try again" after a failed read. */
  retry(): void {
    this.open();
  }

  /** Whether "We met up" has logged it since Habits was read. */
  logged(id: string): boolean {
    return this.loggedIds().has(id);
  }

  /** "We met up" (L2-144 AC1): logged at once; a failure puts it back with "Try again". */
  keep(habit: HabitView, clientId: string = crypto.randomUUID()): void {
    if (this.logged(habit.id)) return;
    const before = this.habits().find((h) => h.id === habit.id) ?? habit;
    this.mark(habit.id, true);
    this.api.keepHabit(habit.id, dayParam(this.today()), clientId).subscribe({
      next: ({ keptId, habit: saved }) => {
        this.replace(saved);
        this.toaster.show(
          'success',
          `${habitTitle(saved.what, saved.contactFirstName)} logged`,
          habitDueBy(saved.dueOn),
          { label: 'Undo', run: () => this.undo(before, keptId) },
        );
      },
      error: () => {
        this.mark(habit.id, false);
        this.replace(before);
        this.toaster.show('danger', HABIT_KEEP_FAILED_HEADING, HABIT_KEEP_FAILED_TEXT, {
          label: 'Try again',
          run: () => this.keep(before, clientId),
        });
      },
    });
  }

  /** Undo of "We met up" (L2-144 AC2): as it was at once, then as the API keeps it. */
  private undo(before: HabitView, keptId: string): void {
    this.mark(before.id, false);
    this.replace(before);
    this.api.unkeepHabit(before.id, keptId).subscribe({ next: (saved) => this.replace(saved) });
  }

  private mark(id: string, logged: boolean): void {
    this.loggedIds.update((ids) => {
      const next = new Set(ids);
      if (logged) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private replace(habit: HabitView): void {
    this.habits.update((list) => list.map((h) => (h.id === habit.id ? habit : h)));
  }
}
