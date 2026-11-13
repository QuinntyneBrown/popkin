import { parity } from '../../fixtures/parity';
import { AddCommentDialog } from '../../pages/add-comment.dialog';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('stars', [
  {
    key: 'experienceDetail',
    name: 'score',
    region: (page) => new ExperienceDetailPage(page).stars,
  },
  // Beside the words "Your rating", above a comment being written.
  { key: 'addComment', name: 'captioned', region: (page) => new AddCommentDialog(page).rating },
]);
