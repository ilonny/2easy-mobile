import type {ImageSourcePropType} from 'react-native';

export type HomeGameCard = {
  id: string;
  title: string;
  subTitle: string;
  image: ImageSourcePropType;
};

export const speakingGames: HomeGameCard[] = [
  {
    id: 'taboo',
    title: 'Taboo game',
    subTitle: '90 cards, A2 — B2 + slang',
    image: require('../../../shared/assets/home/games/taboo.png'),
  },
  {
    id: 'never',
    title: 'Never have I ever',
    subTitle: '130+ cards, A2 — B2',
    image: require('../../../shared/assets/home/games/never-have-i-ever.png'),
  },
  {
    id: 'rather',
    title: 'Would you rather',
    subTitle: '50+ cards, A2+',
    image: require('../../../shared/assets/home/games/would-you-rather.png'),
  },
  {
    id: 'next',
    title: 'What happens next',
    subTitle: '30 short videos, A2 — B2',
    image: require('../../../shared/assets/home/games/what-happens-next.png'),
  },
  {
    id: 'films',
    title: 'What happens next',
    subTitle: 'Films & series',
    image: require('../../../shared/assets/home/games/films-series.png'),
  },
  {
    id: 'if',
    title: 'If you could',
    subTitle: '30 cards, A2+',
    image: require('../../../shared/assets/home/games/if-you-could.png'),
  },
  {
    id: 'name',
    title: 'Name three',
    subTitle: '90 cards, A2+',
    image: require('../../../shared/assets/home/games/name-three.png'),
  },
];

export const discussionCards: HomeGameCard[] = [
  {
    id: 'discussion',
    title: 'Discussion cards',
    subTitle: '140+ cards, A2+',
    image: require('../../../shared/assets/home/games/discussion-cards.png'),
  },
  {
    id: 'controversial',
    title: 'Controversial statements',
    subTitle: '30 cards, A2+',
    image: require('../../../shared/assets/home/games/controversials.png'),
  },
  {
    id: 'meeting',
    title: 'First meeting',
    subTitle: '30 cards, A2+',
    image: require('../../../shared/assets/home/games/first-meeting.png'),
  },
];

export const tariffs = [
  {
    id: 2,
    type: 'month' as const,
    color: '#D2FF88',
    price: 990,
    titleKey: 'subscription.tariffMonth',
    periodKey: 'subscription.perMonth',
  },
  {
    id: 4,
    type: '3month' as const,
    color: '#FFA9CC',
    price: 2490,
    oldPrice: 2970,
    titleKey: 'subscription.tariff3Months',
    periodKey: 'subscription.per3Months',
  },
  {
    id: 3,
    type: 'year' as const,
    color: '#B5E8FF',
    price: 8890,
    oldPrice: 11880,
    titleKey: 'subscription.tariffYear',
    periodKey: 'subscription.perYear',
  },
];
