import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ContactProfileView,
  ContactsSummaryView,
  PeopleView,
  SaveContactRequest,
} from '../../models/contacts';

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
}
