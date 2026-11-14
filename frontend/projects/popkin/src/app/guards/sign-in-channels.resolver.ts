import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AUTH_API, ApiContactChannel } from 'api';
import { catchError, of } from 'rxjs';

/**
 * The ways sign-up and sign-in may reach a person, asked before either screen opens (L2-084).
 * When the API cannot say, an email alone is offered (AC6).
 */
export const signInChannelsResolver: ResolveFn<ApiContactChannel[]> = () =>
  inject(AUTH_API)
    .channels()
    .pipe(catchError(() => of<ApiContactChannel[]>(['Email'])));
