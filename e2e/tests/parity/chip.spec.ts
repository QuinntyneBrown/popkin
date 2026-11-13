import { experienceStates } from '../../fixtures/experience-states';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { ExperiencesPage } from '../../pages/experiences.page';
import { theChatEmpty } from '../../fixtures/chat';
import { parity } from '../../fixtures/parity';
import { GroupChatPage } from '../../pages/group-chat.page';

parity('chip', [
  {
    key: 'groupChatEmpty',
    name: 'opener',
    region: (page) => new GroupChatPage(page).openers.first(),
    before: theChatEmpty,
  },
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'pressed',
    region: (page) => new ExperiencesPage(page).all,
  },
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'not-pressed',
    region: (page) => new ExperiencesPage(page).weDid,
  },
  // One of a radio group: the chosen kind of an experience.
  {
    key: 'shareExperience',
    ...experienceStates.shareExperience,
    name: 'checked',
    region: (page) => new ShareExperienceDialog(page).kind('Something we did'),
  },
  {
    key: 'shareExperience',
    ...experienceStates.shareExperience,
    name: 'not-checked',
    region: (page) => new ShareExperienceDialog(page).kind('Restaurant'),
  },
]);
