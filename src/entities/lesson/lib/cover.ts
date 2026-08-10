import type {ImageSourcePropType} from 'react-native';

import {getLessonImageUrl} from '../lib/filters';

export const LESSON_IMAGE_PLACEHOLDER = require('../../../shared/assets/home/lesson-placeholder.png') as ImageSourcePropType;

export function getLessonCoverSource(imagePath?: string): ImageSourcePropType {
  const uri = getLessonImageUrl(imagePath);
  return uri ? {uri} : LESSON_IMAGE_PLACEHOLDER;
}
