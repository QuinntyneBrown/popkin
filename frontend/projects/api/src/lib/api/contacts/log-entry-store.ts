import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, filter, map, of, switchMap, take } from 'rxjs';
import {
  MilestoneKind,
  PromiseDraft,
  ReminderLead,
  TalkChannel,
  TimelineEntryView,
} from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { loggedAtParam, yearlyHint, yearlyTitle } from './log-entry-text';
import { tooLarge } from './memory-text';

export type LogKind = 'conversation' | 'milestone';

/** A field's problem, with the summary's words and the field's own (L2-133 AC4). */
export interface LogProblem {
  fieldId: string;
  message: string;
  error: string;
}

const NOTE_PROBLEM: LogProblem = {
  fieldId: 'talk',
  message: 'What did you talk about: write a line or two, so you remember it later.',
  error: 'Write a line or two, so you remember it later.',
};
const TITLE_PROBLEM: LogProblem = {
  fieldId: 'what',
  message: 'What happened: say what happened.',
  error: 'Say what happened.',
};
const WHEN_PROBLEM: LogProblem = {
  fieldId: 'when',
  message: 'When: say when it happened.',
  error: 'Say when it happened.',
};

/**
 * Log a conversation or milestone (docs/detailed-designs/contacts/log-entry): the form, what it
 * must have once Save is chosen, and the save, sent at once under one client id. A failure keeps
 * every field (L2-133 AC6); Save sends again under the same id. Provided by the page.
 */
@Injectable()
export class LogEntryStore {
  private readonly api = inject(CONTACTS_API);

  readonly kind = signal<LogKind>('conversation');
  readonly channel = signal<TalkChannel>('InPerson');
  /** The moment Log opened, which a conversation is logged at (known gap 106, ruled). */
  readonly openedAt = signal(new Date());
  readonly note = signal('');
  readonly promises = signal<PromiseDraft[]>([]);
  readonly milestoneKind = signal<MilestoneKind>('NewJob');
  readonly title = signal('');
  readonly happenedOn = signal('');
  readonly milestoneNote = signal('');
  readonly everyYear = signal(true);
  /** A milestone's photo, kept as a memory once the milestone is saved (known gap 107, ruled). */
  readonly photo = signal<File | null>(null);
  /** `photoFailed`: the milestone is saved, its photo is not; Save sends both again. */
  readonly state = signal<'idle' | 'saving' | 'failed' | 'photoFailed'>('idle');
  /** Problems show once Save has been chosen. */
  readonly submitted = signal(false);
  private readonly milestoneLead = signal<ReminderLead>('OnTheDay');
  private readonly firstName = signal('');
  private clientId = crypto.randomUUID();
  private photoClientId = crypto.randomUUID();

  readonly problems = computed<LogProblem[]>(() => {
    const photo = this.photo();
    const large = this.kind() === 'milestone' && photo ? tooLarge('photo', photo.size) : null;
    const photoProblems = large
      ? [{ fieldId: 'photo', message: large.summary, error: large.error }]
      : [];
    if (!this.submitted()) return photoProblems;
    if (this.kind() === 'conversation') return this.note().trim() ? [] : [NOTE_PROBLEM];
    return [
      ...(this.title().trim() ? [] : [TITLE_PROBLEM]),
      ...(this.happenedOn() ? [] : [WHEN_PROBLEM]),
      ...photoProblems,
    ];
  });

  readonly yearlyHint = computed(() =>
    yearlyHint(
      yearlyTitle(this.milestoneKind(), this.firstName(), this.title()),
      this.milestoneLead(),
    ),
  );

  /** Opens the form for a contact, now; reads the Milestones lead for the hint. */
  open(firstName: string, kind: LogKind, now = new Date()): void {
    this.firstName.set(firstName);
    this.kind.set(kind);
    this.openedAt.set(now);
    this.happenedOn.set(dayParam(now));
    this.api.reminderPreferences().subscribe({
      next: (preferences) => this.milestoneLead.set(preferences.milestoneLead),
      error: () => undefined,
    });
  }

  /** Another kind starts a new entry: it is saved under a new client id. */
  choose(kind: LogKind): void {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.submitted.set(false);
    this.state.set('idle');
    this.clientId = crypto.randomUUID();
    this.photoClientId = crypto.randomUUID();
  }

  /** A photo for the milestone; another photo is sent under a new client id. */
  pickPhoto(photo: File): void {
    this.photo.set(photo);
    this.photoClientId = crypto.randomUUID();
  }

  addPromise(promise: PromiseDraft): void {
    this.promises.update((list) => [...list, promise]);
  }

  removePromise(index: number): void {
    this.promises.update((list) => list.filter((_, i) => i !== index));
  }

  /**
   * Save: nothing is sent while a field needs fixing. Answers the request once sent, so the page
   * opens the profile when it succeeds.
   */
  save(contactId: string): Observable<TimelineEntryView> | null {
    this.submitted.set(true);
    if (this.problems().length > 0 || this.state() === 'saving') return null;
    this.state.set('saving');
    const sent =
      this.kind() === 'conversation'
        ? this.api.logConversation(contactId, {
            clientId: this.clientId,
            channel: this.channel(),
            loggedAt: loggedAtParam(this.openedAt()),
            note: this.note().trim(),
            promises: this.promises(),
          })
        : this.api
            .logMilestone(contactId, {
              clientId: this.clientId,
              kind: this.milestoneKind(),
              title: this.title().trim(),
              happenedOn: this.happenedOn(),
              note: this.milestoneNote().trim() || null,
              everyYear: this.everyYear(),
            })
            .pipe(switchMap((entry) => this.sendPhoto(contactId, entry)));
    return new Observable<TimelineEntryView>((subscriber) =>
      sent.subscribe({
        next: (saved) => {
          this.state.set('idle');
          subscriber.next(saved);
          subscriber.complete();
        },
        error: (error: unknown) => {
          this.state.set(error instanceof PhotoFailed ? 'photoFailed' : 'failed');
          subscriber.error(error);
        },
      }),
    );
  }

  /** The milestone's photo as a memory, captioned with what happened, on its day. */
  private sendPhoto(contactId: string, entry: TimelineEntryView): Observable<TimelineEntryView> {
    const photo = this.photo();
    if (!photo) return of(entry);
    return new Observable<TimelineEntryView>((subscriber) =>
      this.api
        .addPhotoMemory(
          contactId,
          this.photoClientId,
          photo,
          this.title().trim(),
          this.happenedOn(),
        )
        .pipe(
          filter((event) => event.kind === 'done'),
          take(1),
          map(() => entry),
        )
        .subscribe({
          next: (saved) => {
            subscriber.next(saved);
            subscriber.complete();
          },
          error: (error: unknown) => subscriber.error(new PhotoFailed(error)),
        }),
    );
  }
}

/** The milestone was saved; its photo was not. */
class PhotoFailed extends Error {
  constructor(readonly reason: unknown) {
    super('The milestone’s photo was not saved.');
  }
}
