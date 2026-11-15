import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFeature } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import { AdminFeaturesStore } from './admin-features.store';

const feature = (name: AdminFeature['feature'], mode: AdminFeature['mode']): AdminFeature => ({
  feature: name,
  mode,
  livePopkins: 3,
  chosen: [],
  changedAt: null,
  changedByName: null,
});

describe('AdminFeaturesStore', () => {
  const features = vi.fn();
  let store: AdminFeaturesStore;

  beforeEach(() => {
    features.mockReturnValue(
      of({ features: [feature('Plan', 'Off'), feature('Schedules', 'Everyone')] }),
    );
    TestBed.configureTestingModule({
      providers: [AdminFeaturesStore, { provide: ADMIN_PLATFORM_API, useValue: { features } }],
    });
    store = TestBed.inject(AdminFeaturesStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('reads the features, and fails when they cannot be read (L2-076 AC9)', () => {
    store.load();
    expect(store.status()).toBe('ready');
    expect(store.features().map((f) => f.feature)).toEqual(['Plan', 'Schedules']);

    features.mockReturnValue(throwError(() => new Error('down')));
    store.load();
    expect(store.status()).toBe('failed');
  });

  it('puts a saved feature in its panel’s place (L2-076 AC7)', () => {
    store.load();
    store.saved(feature('Schedules', 'Off'));
    expect(store.features().map((f) => f.mode)).toEqual(['Off', 'Off']);
  });
});
