import {LessonViewerScreen} from '../../../features/lesson-player';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {LessonsStackParamList} from '../../../app/navigation/types';

type Props = NativeStackScreenProps<LessonsStackParamList, 'LessonViewer'>;

export function LessonViewerPage({route}: Props) {
  return (
    <LessonViewerScreen
      lessonId={route.params.lessonId}
      from={route.params.from}
      studentId={route.params.studentId}
      sessionId={route.params.sessionId}
    />
  );
}
