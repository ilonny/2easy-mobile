import {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {Button} from '../../../shared/ui';
import {createLesson} from '../../lesson-player/api/lessonApi';
import {CreateLessonModal} from './CreateLessonModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  title?: string;
  description?: string;
  tags?: string;
  courseId?: number;
  buttonTitle?: string;
  onCreated?: (lessonId: number) => void;
};

/**
 * Opens create-lesson meta modal first; navigates to constructor only
 * after the lesson is successfully created.
 */
export function CreateLessonButton({
  title,
  description = '',
  tags = '',
  courseId,
  buttonTitle,
  onCreated,
}: Props) {
  const {t} = useI18n();
  const navigation = useNavigation<Nav>();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        title={buttonTitle || t('editor.createLesson')}
        onPress={() => setModalOpen(true)}
      />
      <CreateLessonModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        courseId={courseId}
        initialTitle={title || ''}
        initialDescription={description}
        initialTags={tags}
        onCreated={lessonId => {
          setModalOpen(false);
          onCreated?.(lessonId);
          navigation.navigate('LessonEditor', {lessonId});
        }}
      />
    </>
  );
}

export async function createLessonAndGetId(payload: {
  title: string;
  description?: string;
  tags?: string;
  course_id?: number;
  image_id?: number;
}): Promise<number> {
  const res = (await createLesson(payload)) as {
    createdLesson?: {id?: number};
  };
  return Number(res?.createdLesson?.id || 0);
}
