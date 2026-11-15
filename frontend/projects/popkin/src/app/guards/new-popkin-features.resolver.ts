import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { POPKINS_API, PopkinFeature } from 'api';
import { catchError, map, of } from 'rxjs';

/**
 * The features a new Popkin is offered, asked before each step of starting one opens (L2-152
 * AC1, AC2, AC8). When the API cannot say, nothing is offered: the safe answer (ADR 0023).
 */
export const newPopkinFeaturesResolver: ResolveFn<PopkinFeature[]> = () =>
  inject(POPKINS_API)
    .newPopkinFeatures()
    .pipe(
      map((answer) => answer.offered),
      catchError(() => of<PopkinFeature[]>([])),
    );
