import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('keen-panel', [
  // Seven keen, four faces and "+3", and "I'm keen" not pressed (L2-042 AC1).
  {
    key: 'experienceDetailWant',
    ...experienceStates.experienceDetailWant,
    name: 'asks',
    region: (page) => new ExperienceDetailPage(page).keenPanel,
  },
  // "You're keen" pressed, and eight keen (AC2).
  {
    key: 'experienceDetailWantKeen',
    ...experienceStates.experienceDetailWantKeen,
    name: 'keen',
    region: (page) => new ExperienceDetailPage(page).keenPanel,
  },
  // Ellie shared it and is keen: "We did this" beside "You're keen" (AC4).
  {
    key: 'experienceDetailWantOwn',
    ...experienceStates.experienceDetailWantOwn,
    name: 'own',
    region: (page) => new ExperienceDetailPage(page).keenPanel,
  },
]);
