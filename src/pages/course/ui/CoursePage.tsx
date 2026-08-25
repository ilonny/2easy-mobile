import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {LessonsStackParamList} from '../../../app/navigation/types';
import {CourseScreen} from '../../../features/lesson-plans/ui/CourseScreen';

type Props = NativeStackScreenProps<LessonsStackParamList, 'Course'>;

export function CoursePage({route}: Props) {
  return <CourseScreen courseId={route.params.courseId} />;
}
