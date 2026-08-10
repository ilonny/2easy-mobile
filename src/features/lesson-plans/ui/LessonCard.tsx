import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {getLessonCoverSource, type Lesson} from '../../../entities/lesson';
import {colors, radii} from '../../../shared/config/theme';

type Props = {
  lesson: Lesson;
  onPress: (lesson: Lesson) => void;
};

export function LessonCard({lesson, onPress}: Props) {
  return (
    <Pressable
      onPress={() => onPress(lesson)}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <Image
          source={getLessonCoverSource(lesson.image_path)}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {lesson.title}
        </Text>
        {!!lesson.tags && (
          <Text style={styles.tags} numberOfLines={1}>
            {lesson.tags}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.94,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
    minHeight: 64,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  tags: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
