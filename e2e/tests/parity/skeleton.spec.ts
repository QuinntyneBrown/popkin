import { experienceStates } from '../../fixtures/experience-states';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';
import { ExperiencesPage } from '../../pages/experiences.page';
import { theInviteLoading } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';

parity('skeleton', [
  {
    key: 'joinInviteLoading',
    name: 'button',
    region: (page) => new JoinInvitePage(page).buttonSkeleton,
    before: theInviteLoading,
  },
  {
    key: 'experiencesLoading',
    ...experienceStates.experiencesLoading,
    name: 'media',
    region: (page) => new ExperiencesPage(page).skeletons.first(),
  },
  // The picture of an experience that is loading, with Back over it.
  {
    key: 'experienceDetailLoading',
    ...experienceStates.experienceDetailLoading,
    name: 'picture',
    region: (page) => new ExperienceDetailPage(page).picture,
  },
]);
