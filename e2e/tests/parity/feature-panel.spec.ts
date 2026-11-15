import type { Page } from '@playwright/test';
import {
  signedInAs,
  theMockFeatures,
  theMockFeaturesForEveryone,
  theMockFeaturesOff,
} from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { hold } from '../../fixtures/stubs';
import { FeaturesPage } from '../../pages/admin/features.page';

const plan = (page: Page) => new FeaturesPage(page).plan.panel;
const schedules = (page: Page) => new FeaturesPage(page).schedules.panel;

parity('feature-panel', [
  // On for everyone, and on for chosen Popkins with their chips (L2-076 AC1, AC5).
  {
    key: 'adminFeatures',
    name: 'everyone',
    region: plan,
    before: async (page) => void (await theMockFeatures(page)),
  },
  {
    key: 'adminFeatures',
    name: 'chosen',
    region: schedules,
    before: async (page) => void (await theMockFeatures(page)),
  },
  { key: 'adminFeaturesOff', name: 'off', region: schedules, before: theMockFeaturesOff },
  {
    key: 'adminFeaturesEveryone',
    name: 'everyone-today',
    region: schedules,
    before: theMockFeaturesForEveryone,
  },
  // A Support admin sees every choice switched off (L2-076 AC12).
  {
    key: 'adminFeaturesSupport',
    name: 'switched-off',
    region: schedules,
    before: async (page) => {
      await theMockFeatures(page);
      await signedInAs(page, 'Support');
    },
  },
  // Skeletons while the switches load.
  {
    key: 'adminFeaturesLoading',
    name: 'loading',
    region: (page) => new FeaturesPage(page).panels.first(),
    before: async (page) => {
      await theMockFeatures(page);
      await hold(page, 'GET /api/admin/features');
    },
  },
]);
