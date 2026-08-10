import type {ImageSourcePropType} from 'react-native';

export const images: ImageSourcePropType[] = [
  require('../../../../shared/assets/game-packs/bingo/1.jpg'),
  require('../../../../shared/assets/game-packs/bingo/2.jpg'),
  require('../../../../shared/assets/game-packs/bingo/3.jpg'),
  require('../../../../shared/assets/game-packs/bingo/4.jpg'),
  require('../../../../shared/assets/game-packs/bingo/5.jpg'),
  require('../../../../shared/assets/game-packs/bingo/bingo.jpg'),
];

export const byTab: Record<string, ImageSourcePropType[]> = {
  'all': [
    require('../../../../shared/assets/game-packs/bingo/1.jpg'),
    require('../../../../shared/assets/game-packs/bingo/2.jpg'),
    require('../../../../shared/assets/game-packs/bingo/3.jpg'),
    require('../../../../shared/assets/game-packs/bingo/4.jpg'),
    require('../../../../shared/assets/game-packs/bingo/5.jpg'),
    require('../../../../shared/assets/game-packs/bingo/bingo.jpg'),
  ],
};
