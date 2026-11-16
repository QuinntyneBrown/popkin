import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContactsSummaryView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { ContactsFrame } from './contacts-frame';

describe('ContactsFrame', () => {
  let answer: ContactsSummaryView | 'down';
  let frame: ContactsFrame;

  beforeEach(() => {
    answer = { people: 13 };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CONTACTS_API,
          useValue: {
            summary: (): Observable<ContactsSummaryView> =>
              answer === 'down'
                ? throwError(() => new HttpErrorResponse({ status: 0 }))
                : of(answer),
            followUps: () =>
              of([
                {
                  id: 'f1',
                  text: 'Return Ruth’s ladder',
                  contactId: null,
                  contactFirstName: null,
                  contactInitials: null,
                  contactAccent: null,
                  contactPhotoUrl: null,
                  dueOn: '2000-01-01',
                  isPromise: false,
                  promisedVia: null,
                  promisedOn: null,
                  createdAt: '2000-01-01T00:00:00Z',
                  doneAt: null,
                },
              ]),
          },
        },
      ],
    });
    frame = TestBed.inject(ContactsFrame);
  });

  it('says nothing before the summary is read', () => {
    expect(frame.people()).toBeNull();
    expect(frame.countLine()).toBe('');
  });

  // L2-121 AC3
  it('counts the people kept once read', () => {
    frame.refresh();

    expect(frame.people()).toBe(13);
    expect(frame.countLine()).toBe('13 people · only you');
  });

  it('says only you can see them with nobody kept', () => {
    answer = { people: 0 };

    frame.refresh();

    expect(frame.countLine()).toBe('Only you can see them');
  });

  it('keeps the last answer when a read fails', () => {
    frame.refresh();
    answer = 'down';

    frame.refresh();

    expect(frame.people()).toBe(13);
  });

  // ADR 0023
  it('is open once the summary answers, and keeps it', () => {
    let open: boolean | undefined;

    frame.open().subscribe((answer) => (open = answer));

    expect(open).toBe(true);
    expect(frame.people()).toBe(13);
  });

  // ADR 0023: switched off, or the API cannot say
  it('is closed when the summary fails', () => {
    answer = 'down';
    let open: boolean | undefined;

    frame.open().subscribe((answer) => (open = answer));

    expect(open).toBe(false);
  });

  it('counts the follow-ups late or due today once Contacts opens, for the badge (L2-121 AC5)', () => {
    expect(frame.due()).toBe(0);

    frame.open().subscribe();

    expect(frame.due()).toBe(1);
    expect(frame.dueLabel()).toBe('1 follow-up late or due today');
  });
});
