import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { ConnectRequest, ConnectionView, ConnectionsView } from '../../models/connections';
import { GroupView, MakeGroupRequest } from '../../models/groups';
import {
  AddFollowUpRequest,
  AddKeyDateRequest,
  ContactDatesView,
  ContactKeyDateView,
  ContactProfileView,
  ContactsSummaryView,
  DatesFilter,
  FileMemoryView,
  FollowUpView,
  HabitKeptView,
  HabitView,
  KeyDateRowView,
  LogConversationRequest,
  LogMilestoneRequest,
  MemoriesView,
  MemoryUploadEvent,
  NoteMemoryView,
  PeopleView,
  PhotoMemoryView,
  ReminderLead,
  ReminderPreferencesView,
  SaveContactRequest,
  StartHabitRequest,
  TimelineEntryView,
  TimelineShow,
  TimelineView,
} from '../../models/contacts';
import { ImportCandidatesView, ImportContactsRequest, ImportResultView } from '../../models/import';
import { ContactReminderView } from '../../models/reminders';
import { TodayView } from '../../models/today';

/**
 * My own Contacts (docs/detailed-designs/contacts). Every call answers 404 `feature_off` while
 * Contacts is switched off (ADR 0023).
 */
export interface ContactsApi {
  /** How many contacts I keep; also how the app learns Contacts is open (L2-121 AC1). */
  summary(): Observable<ContactsSummaryView>;
  /** Add someone (L2-129): the contact and, when one was picked, their photo. */
  addContact(request: SaveContactRequest, photo: File | null): Observable<ContactProfileView>;
  /** Deletes a contact of mine and what was kept about them (L2-132). */
  deleteContact(contactId: string): Observable<void>;
  /** People: every contact of mine, for the device's day `on` (yyyy-MM-dd) (L2-126). */
  people(on: string): Observable<PeopleView>;
  /** One contact of mine; anyone else's is 404 `contact_not_found` (L2-122 AC1). */
  contact(contactId: string): Observable<ContactProfileView>;
  /** Edit (L2-130): the same part `contact`, and a photo that replaces theirs (AC4). */
  editContact(
    contactId: string,
    request: SaveContactRequest,
    photo: File | null,
  ): Observable<ContactProfileView>;
  /** Into Closest (L2-131 AC4). */
  addToClosest(contactId: string): Observable<void>;
  /** Out of Closest; they stay in People and their circle (L2-131 AC2). */
  takeOutOfClosest(contactId: string): Observable<void>;
  /** Dates: every next occurrence within a year, soonest first, for the device's day (L2-137). */
  dates(on: string, kind: DatesFilter): Observable<ContactDatesView>;
  /** Add a date for a contact of mine (L2-138). */
  addKeyDate(contactId: string, request: AddKeyDateRequest): Observable<KeyDateRowView>;
  /**
   * One date's own reminder: how early, whether at all, or both (L2-139 AC3, L2-159). 404
   * `key_date_not_found`, 400 `lead_not_allowed`.
   */
  changeKeyDateReminder(
    keyDateId: string,
    change: { lead?: ReminderLead; on?: boolean },
  ): Observable<ContactKeyDateView>;
  /** My default lead times and reminder ways; the defaults until I change them (L2-139 AC1). */
  reminderPreferences(): Observable<ReminderPreferencesView>;
  /** Saves my default lead times and reminder ways (L2-139). */
  saveReminderPreferences(
    preferences: ReminderPreferencesView,
  ): Observable<ReminderPreferencesView>;
  /** Every follow-up of mine, open and done (L2-141). */
  followUps(): Observable<FollowUpView[]>;
  /** "Add a follow-up" (L2-142 AC1); a resend under the same client id keeps it once. */
  addFollowUp(request: AddFollowUpRequest): Observable<FollowUpView>;
  /** "Mark done" and "Mark not done" (L2-142 AC2, AC3). */
  setFollowUpDone(id: string, done: boolean): Observable<FollowUpView>;
  /** Habits (L2-143): every running habit, the one due soonest first. */
  habits(): Observable<HabitView[]>;
  /** "Start the habit" (L2-145). */
  startHabit(request: StartHabitRequest): Observable<HabitView>;
  /** "We met up" on the device's day (L2-144 AC1). */
  keepHabit(id: string, keptOn: string, clientId: string): Observable<HabitKeptView>;
  /** Its Undo (L2-144 AC2). */
  unkeepHabit(id: string, keptId: string): Observable<HabitView>;
  /** "End this habit" (L2-144 AC3). */
  endHabit(id: string): Observable<void>;
  /** Its Undo. */
  resumeHabit(id: string): Observable<HabitView>;
  /** Groups (L2-146), for the device's day; without it, the API's own. */
  groups(on?: string): Observable<GroupView[]>;
  /** "Make the group" (L2-147); a resend keeps it once. */
  makeGroup(request: MakeGroupRequest): Observable<GroupView>;
  /** "Add {n} people" (L2-147 AC3). */
  addGroupPeople(groupId: string, contactIds: string[]): Observable<GroupView>;
  /** "Start a Popkin with them": links the group and invites its members (L2-148 AC3). */
  invitePopkinGroup(popkinId: string, groupId: string): Observable<void>;
  /** Who the person shares a Popkin with, not yet in Contacts (L2-151). */
  importCandidates(): Observable<ImportCandidatesView>;
  importPeople(request: ImportContactsRequest): Observable<ImportResultView>;
  /** Today for the device's day (L2-125). */
  today(on: string): Observable<TodayView>;
  /** The undismissed reminders, oldest first (L2-140 AC1). */
  reminders(): Observable<ContactReminderView[]>;
  dismissReminder(id: string): Observable<void>;
  /** Connections: the faces and the lines (L2-149). */
  connectionMap(): Observable<ConnectionsView>;
  /** Connect (L2-150); a resend keeps it once. */
  connect(request: ConnectRequest): Observable<ConnectionView>;
  /** Removes a connection (L2-150 AC9). */
  disconnect(id: string): Observable<void>;
  /** A contact's timeline, newest first, filtered by kind (L2-135 AC1). */
  timeline(contactId: string, show: TimelineShow): Observable<TimelineView>;
  /** Log a conversation and its promises (L2-133); a resend keeps it once. */
  logConversation(
    contactId: string,
    request: LogConversationRequest,
  ): Observable<TimelineEntryView>;
  /** Log a milestone, and its yearly date when asked (L2-134). */
  logMilestone(contactId: string, request: LogMilestoneRequest): Observable<TimelineEntryView>;
  /** "Memories & files" (L2-136 AC1). */
  memories(contactId: string): Observable<MemoriesView>;
  /** Keeps a photo, reporting how much is sent (L2-136 AC2, AC4); `takenOn` dates it. */
  addPhotoMemory(
    contactId: string,
    clientId: string,
    file: File,
    caption: string,
    takenOn?: string,
  ): Observable<MemoryUploadEvent<PhotoMemoryView>>;
  /** Keeps a file as it is, reporting how much is sent (known gap 107, ruled). */
  addFileMemory(
    contactId: string,
    clientId: string,
    file: File,
  ): Observable<MemoryUploadEvent<FileMemoryView>>;
  /** Keeps a note (known gap 107, ruled). */
  addNoteMemory(contactId: string, clientId: string, text: string): Observable<NoteMemoryView>;
}

export const CONTACTS_API = new InjectionToken<ContactsApi>('ContactsApi');

@Injectable()
export class HttpContactsApi implements ContactsApi {
  private readonly http = inject(HttpClient);

  summary(): Observable<ContactsSummaryView> {
    return this.http.get<ContactsSummaryView>('/api/contacts/summary');
  }

  addContact(request: SaveContactRequest, photo: File | null): Observable<ContactProfileView> {
    const form = new FormData();
    // A text part: the API reads `contact` as a field, not a file.
    form.set('contact', JSON.stringify(request));
    if (photo) form.set('photo', photo);
    return this.http.post<ContactProfileView>('/api/contacts/people', form);
  }

  deleteContact(contactId: string): Observable<void> {
    return this.http.delete<void>(`/api/contacts/people/${contactId}`);
  }

  people(on: string): Observable<PeopleView> {
    return this.http.get<PeopleView>('/api/contacts/people', { params: { on } });
  }

  contact(contactId: string): Observable<ContactProfileView> {
    return this.http.get<ContactProfileView>(`/api/contacts/people/${contactId}`);
  }

  editContact(
    contactId: string,
    request: SaveContactRequest,
    photo: File | null,
  ): Observable<ContactProfileView> {
    const form = new FormData();
    form.set('contact', JSON.stringify(request));
    if (photo) form.set('photo', photo);
    return this.http.put<ContactProfileView>(`/api/contacts/people/${contactId}`, form);
  }

  addToClosest(contactId: string): Observable<void> {
    return this.http.put<void>(`/api/contacts/people/${contactId}/closest`, null);
  }

  takeOutOfClosest(contactId: string): Observable<void> {
    return this.http.delete<void>(`/api/contacts/people/${contactId}/closest`);
  }

  dates(on: string, kind: DatesFilter): Observable<ContactDatesView> {
    return this.http.get<ContactDatesView>('/api/contacts/dates', { params: { on, kind } });
  }

  addKeyDate(contactId: string, request: AddKeyDateRequest): Observable<KeyDateRowView> {
    return this.http.post<KeyDateRowView>(`/api/contacts/people/${contactId}/key-dates`, request);
  }

  changeKeyDateReminder(
    keyDateId: string,
    change: { lead?: ReminderLead; on?: boolean },
  ): Observable<ContactKeyDateView> {
    return this.http.put<ContactKeyDateView>(
      `/api/contacts/key-dates/${keyDateId}/reminder`,
      change,
    );
  }

  reminderPreferences(): Observable<ReminderPreferencesView> {
    return this.http.get<ReminderPreferencesView>('/api/contacts/reminder-preferences');
  }

  saveReminderPreferences(
    preferences: ReminderPreferencesView,
  ): Observable<ReminderPreferencesView> {
    return this.http.put<ReminderPreferencesView>(
      '/api/contacts/reminder-preferences',
      preferences,
    );
  }

  followUps(): Observable<FollowUpView[]> {
    return this.http.get<FollowUpView[]>('/api/contacts/follow-ups');
  }

  addFollowUp(request: AddFollowUpRequest): Observable<FollowUpView> {
    return this.http.post<FollowUpView>('/api/contacts/follow-ups', request);
  }

  setFollowUpDone(id: string, done: boolean): Observable<FollowUpView> {
    return this.http.put<FollowUpView>(`/api/contacts/follow-ups/${id}/done`, { done });
  }

  habits(): Observable<HabitView[]> {
    return this.http.get<HabitView[]>('/api/contacts/habits');
  }

  startHabit(request: StartHabitRequest): Observable<HabitView> {
    return this.http.post<HabitView>('/api/contacts/habits', request);
  }

  keepHabit(id: string, keptOn: string, clientId: string): Observable<HabitKeptView> {
    return this.http.post<HabitKeptView>(`/api/contacts/habits/${id}/kept`, { clientId, keptOn });
  }

  unkeepHabit(id: string, keptId: string): Observable<HabitView> {
    return this.http.delete<HabitView>(`/api/contacts/habits/${id}/kept/${keptId}`);
  }

  endHabit(id: string): Observable<void> {
    return this.http.post<void>(`/api/contacts/habits/${id}/end`, null);
  }

  resumeHabit(id: string): Observable<HabitView> {
    return this.http.delete<HabitView>(`/api/contacts/habits/${id}/end`);
  }

  groups(on?: string): Observable<GroupView[]> {
    return this.http.get<GroupView[]>('/api/contacts/groups', on ? { params: { on } } : {});
  }

  makeGroup(request: MakeGroupRequest): Observable<GroupView> {
    return this.http.post<GroupView>('/api/contacts/groups', request);
  }

  addGroupPeople(groupId: string, contactIds: string[]): Observable<GroupView> {
    return this.http.post<GroupView>(`/api/contacts/groups/${groupId}/members`, { contactIds });
  }

  invitePopkinGroup(popkinId: string, groupId: string): Observable<void> {
    return this.http.post<void>(`/api/contacts/groups/${groupId}/popkin`, { popkinId });
  }

  importCandidates(): Observable<ImportCandidatesView> {
    return this.http.get<ImportCandidatesView>('/api/contacts/import');
  }

  importPeople(request: ImportContactsRequest): Observable<ImportResultView> {
    return this.http.post<ImportResultView>('/api/contacts/import', request);
  }

  today(on: string): Observable<TodayView> {
    return this.http.get<TodayView>('/api/contacts/today', { params: { on } });
  }

  reminders(): Observable<ContactReminderView[]> {
    return this.http.get<ContactReminderView[]>('/api/contacts/reminders');
  }

  dismissReminder(id: string): Observable<void> {
    return this.http.post<void>(`/api/contacts/reminders/${id}/dismissal`, null);
  }

  connectionMap(): Observable<ConnectionsView> {
    return this.http.get<ConnectionsView>('/api/contacts/connections');
  }

  connect(request: ConnectRequest): Observable<ConnectionView> {
    return this.http.post<ConnectionView>('/api/contacts/connections', request);
  }

  disconnect(id: string): Observable<void> {
    return this.http.delete<void>(`/api/contacts/connections/${id}`);
  }

  timeline(contactId: string, show: TimelineShow): Observable<TimelineView> {
    return this.http.get<TimelineView>(`/api/contacts/people/${contactId}/timeline`, {
      params: { show },
    });
  }

  logConversation(
    contactId: string,
    request: LogConversationRequest,
  ): Observable<TimelineEntryView> {
    return this.http.post<TimelineEntryView>(
      `/api/contacts/people/${contactId}/conversations`,
      request,
    );
  }

  logMilestone(contactId: string, request: LogMilestoneRequest): Observable<TimelineEntryView> {
    return this.http.post<TimelineEntryView>(
      `/api/contacts/people/${contactId}/milestones`,
      request,
    );
  }

  memories(contactId: string): Observable<MemoriesView> {
    return this.http.get<MemoriesView>(memories(contactId));
  }

  addPhotoMemory(
    contactId: string,
    clientId: string,
    file: File,
    caption: string,
    takenOn?: string,
  ): Observable<MemoryUploadEvent<PhotoMemoryView>> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('clientId', clientId);
    if (caption) form.append('caption', caption);
    if (takenOn) form.append('takenOn', takenOn);
    return upload(this.http, `${memories(contactId)}/photos`, form);
  }

  addFileMemory(
    contactId: string,
    clientId: string,
    file: File,
  ): Observable<MemoryUploadEvent<FileMemoryView>> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('clientId', clientId);
    return upload(this.http, `${memories(contactId)}/files`, form);
  }

  addNoteMemory(contactId: string, clientId: string, text: string): Observable<NoteMemoryView> {
    return this.http.post<NoteMemoryView>(`${memories(contactId)}/notes`, { clientId, text });
  }
}

function memories(contactId: string): string {
  return `/api/contacts/people/${encodeURIComponent(contactId)}/memories`;
}

function upload<T>(
  http: HttpClient,
  url: string,
  form: FormData,
): Observable<MemoryUploadEvent<T>> {
  return http.post<T>(url, form, { reportProgress: true, observe: 'events' }).pipe(
    map((event: HttpEvent<T>): MemoryUploadEvent<T> | null => {
      if (event.type === HttpEventType.UploadProgress) {
        return { kind: 'progress', sent: event.loaded, total: event.total ?? event.loaded };
      }
      if (event.type === HttpEventType.Response && event.body) {
        return { kind: 'done', memory: event.body };
      }
      return null;
    }),
    filter((event): event is MemoryUploadEvent<T> => event !== null),
  );
}
