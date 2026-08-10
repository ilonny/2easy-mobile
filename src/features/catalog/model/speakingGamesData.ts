import type {ImageSourcePropType} from 'react-native';

import type {ContentSlug} from './contentRegistry';

export type CatalogItem = {
  id: number;
  titleKey: string;
  descriptionKey: string;
  slug: ContentSlug;
  image: ImageSourcePropType;
};

export const speakingGamesCatalog: CatalogItem[] = [
  {
    id: 8,
    titleKey: 'games.bingo.title',
    descriptionKey: 'games.bingo.description',
    slug: 'bingo',
    image: require('../../../shared/assets/speaking-games/bingo.png'),
  },
  {
    id: 1,
    titleKey: 'games.taboo.title',
    descriptionKey: 'games.taboo.description',
    slug: 'taboo',
    image: require('../../../shared/assets/speaking-games/taboo.png'),
  },
  {
    id: 2,
    titleKey: 'games.neverHaveIEver.title',
    descriptionKey: 'games.neverHaveIEver.description',
    slug: 'never_have_i_ever',
    image: require('../../../shared/assets/speaking-games/never-have-i-ever.png'),
  },
  {
    id: 3,
    titleKey: 'games.wouldYouRather.title',
    descriptionKey: 'games.wouldYouRather.description',
    slug: 'would_you_rather',
    image: require('../../../shared/assets/speaking-games/would-you-rather.png'),
  },
  {
    id: 4,
    titleKey: 'games.ifYouCould.title',
    descriptionKey: 'games.ifYouCould.description',
    slug: 'if_you_could',
    image: require('../../../shared/assets/speaking-games/if-you-could.png'),
  },
  {
    id: 5,
    titleKey: 'games.whatHappensNext.title',
    descriptionKey: 'games.whatHappensNext.description',
    slug: 'what_happens_next',
    image: require('../../../shared/assets/speaking-games/what-happens-next.png'),
  },
  {
    id: 6,
    titleKey: 'games.whatHappensNextFilms.title',
    descriptionKey: 'games.whatHappensNextFilms.description',
    slug: 'what_happens_next_films',
    image: require('../../../shared/assets/speaking-games/what-happens-next-films.png'),
  },
  {
    id: 7,
    titleKey: 'games.nameThree.title',
    descriptionKey: 'games.nameThree.description',
    slug: 'name_three',
    image: require('../../../shared/assets/speaking-games/name-three.png'),
  },
];
