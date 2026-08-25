import {StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {LessonPlayerProvider} from '../../../lesson-player/model/LessonPlayerContext';
import {ChipDragProvider} from '../../../lesson-player/ui/interaction/ChipDragContext';
import {ExViewRouter} from '../../../lesson-player/ui/views/ExViewRouter';

type Props = {
  type: string;
  data: Record<string, unknown>;
  lessonId?: number;
};

/**
 * Read-only live preview of an exercise while editing (site parity).
 */
export function ExercisePreview({type, data, lessonId = 0}: Props) {
  return (
    <LessonPlayerProvider
      value={{
        lessonId,
        isTeacher: true,
        isView: true,
        isEdit: false,
      }}>
      <ChipDragProvider>
        <View style={styles.wrap}>
          <ExViewRouter
            type={type}
            data={{...data, id: data.id ?? 0}}
          />
        </View>
      </ChipDragProvider>
    </LessonPlayerProvider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: 12,
    overflow: 'hidden',
  },
});
