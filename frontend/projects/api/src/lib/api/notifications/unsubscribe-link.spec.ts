import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { NOTIFICATIONS_API } from './notifications-api';
import { UnsubscribeLink } from './unsubscribe-link';

function linkWith(unsubscribe: (token: string) => Observable<void>): UnsubscribeLink {
  TestBed.configureTestingModule({
    providers: [UnsubscribeLink, { provide: NOTIFICATIONS_API, useValue: { unsubscribe } }],
  });
  return TestBed.inject(UnsubscribeLink);
}

const gone = () => throwError(() => new HttpErrorResponse({ status: 410 }));

describe('UnsubscribeLink', () => {
  it('posts the token once and says the person is unsubscribed', () => {
    const answer = new Subject<void>();
    const unsubscribe = vi.fn(() => answer);
    const link = linkWith(unsubscribe);

    link.use('abc');
    expect(link.outcome()).toBe('working');
    answer.next();
    answer.complete();

    expect(unsubscribe).toHaveBeenCalledExactlyOnceWith('abc');
    expect(link.outcome()).toBe('unsubscribed');
  });

  it('says the link expired when the API answers 410', () => {
    const link = linkWith(gone);

    link.use('abc');

    expect(link.outcome()).toBe('expired');
  });

  it('says the link expired, posting nothing, when it carries no token', () => {
    const unsubscribe = vi.fn(() => of(undefined));
    const link = linkWith(unsubscribe);

    link.use(null);

    expect(unsubscribe).not.toHaveBeenCalled();
    expect(link.outcome()).toBe('expired');
  });

  it('fails for any other answer, and Try again posts again', () => {
    let calls = 0;
    const link = linkWith(() =>
      ++calls === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(undefined),
    );

    link.use('abc');
    expect(link.outcome()).toBe('failed');
    link.retry();

    expect(link.outcome()).toBe('unsubscribed');
  });
});
