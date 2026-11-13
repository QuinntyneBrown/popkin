import { ExperienceDetailPage } from '../../pages/experience-detail.page';
import { ExperiencesPage } from '../../pages/experiences.page';
import { theMockHome } from '../../fixtures/home';
import { parity } from '../../fixtures/parity';
import { PopkinHomePage } from '../../pages/popkin-home.page';

parity('rating', [
  {
    key: 'popkinHome',
    name: 'score',
    region: (page) => new PopkinHomePage(page).firstRating,
    before: theMockHome,
  },
  // On an experience card: the number of ratings in brackets.
  {
    key: 'experiences',
    name: 'counted',
    region: (page) => new ExperiencesPage(page).ratingOf('Sunrise canoe to Heron Point'),
  },
  // On a comment: the stars one member gave.
  {
    key: 'experienceDetail',
    name: 'of-a-comment',
    region: (page) => new ExperienceDetailPage(page).firstComment.locator('.rating'),
  },
]);
