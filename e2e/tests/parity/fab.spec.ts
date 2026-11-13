import { experienceStates } from '../../fixtures/experience-states';
import { ExperiencesPage } from '../../pages/experiences.page';
import { theMockPopkins } from '../../fixtures/my-popkins';
import { MyPopkinsPage } from '../../pages/my-popkins.page';
import { parity } from '../../fixtures/parity';
import { theMockPhotos } from '../../fixtures/photos';
import { PhotoAlbumPage } from '../../pages/photo-album.page';

// The floating action is a phone's; from 768 px the header holds "Add photos".
parity('fab', [
  {
    key: 'photoAlbum',
    name: 'add',
    region: (page) => new PhotoAlbumPage(page).fab,
    before: theMockPhotos,
    widths: [360],
  },
  // On a page with no tabs the action sits low.
  {
    key: 'myPopkins',
    name: 'new-popkin',
    region: (page) => new MyPopkinsPage(page).fab,
    before: theMockPopkins,
    widths: [360],
  },
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'share-one',
    region: (page) => new ExperiencesPage(page).fab,
    widths: [360],
  },
]);
