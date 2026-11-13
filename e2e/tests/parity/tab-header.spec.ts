import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { ExperiencesPage } from '../../pages/experiences.page';
import { parity } from '../../fixtures/parity';
import {
  theAlbumEmpty,
  theAlbumLoading,
  theAlbumWithoutMine,
  theMockPhotos,
} from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

const header = (page: import('@playwright/test').Page) => new PhotoAlbumPage(page).header;

parity('tab-header', [
  { key: 'photoAlbum', name: 'filters', region: header, before: theMockPhotos },
  {
    key: 'photoAlbumMine',
    name: 'mine',
    region: header,
    before: theMockPhotos,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
  },
  {
    key: 'photoAlbumNoResults',
    name: 'no-results',
    region: header,
    before: theAlbumWithoutMine,
    app: (page) => new PhotoAlbumPage(page).mine.click(),
  },
  { key: 'photoAlbumEmpty', name: 'empty', region: header, before: theAlbumEmpty },
  { key: 'photoAlbumLoading', name: 'loading', region: header, before: theAlbumLoading },
  // Experiences: three filters and "Share one", which is in the header from 768 px.
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'experiences',
    region: (page) => new ExperiencesPage(page).header,
  },
  {
    key: 'experiencesDid',
    ...experienceStates.experiencesDid,
    name: 'experiences-did',
    region: (page) => new ExperiencesPage(page).header,
  },
  {
    key: 'experiencesNoResults',
    ...experienceStates.experiencesNoResults,
    name: 'experiences-no-results',
    region: (page) => new ExperiencesPage(page).header,
  },
  {
    key: 'experiencesEmpty',
    ...experienceStates.experiencesEmpty,
    name: 'experiences-empty',
    region: (page) => new ExperiencesPage(page).header,
  },
  // A wrapped-up Popkin: nothing to add, so no action beside the filters.
  {
    key: 'photoAlbumWrapped',
    ...wrapUpStates.photoAlbumWrapped,
    name: 'photos-wrapped',
    region: (page) => new PhotoAlbumPage(page).header,
  },
  {
    key: 'photoAlbumRemoved',
    ...wrapUpStates.photoAlbumRemoved,
    name: 'photos-removed',
    region: (page) => new PhotoAlbumPage(page).header,
  },
  {
    key: 'experiencesWrapped',
    ...wrapUpStates.experiencesWrapped,
    name: 'experiences-wrapped',
    region: (page) => new ExperiencesPage(page).header,
  },
]);
