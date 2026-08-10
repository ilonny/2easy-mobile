import type {CatalogItem} from './speakingGamesData';

export const discussionCardsCatalog: CatalogItem[] = [
  {
    id: 1,
    titleKey: 'games.discussionCards.title',
    descriptionKey: 'games.discussionCards.description',
    slug: 'discussion_cards',
    image: require('../../../shared/assets/cards/discussion-cards.png'),
  },
  {
    id: 2,
    titleKey: 'games.controversial.title',
    descriptionKey: 'games.controversial.description',
    slug: 'controversial_statements',
    image: require('../../../shared/assets/cards/controversial.png'),
  },
  {
    id: 3,
    titleKey: 'games.firstMeeting.title',
    descriptionKey: 'games.firstMeeting.description',
    slug: 'first_meeting',
    image: require('../../../shared/assets/cards/first-meeting.png'),
  },
];
