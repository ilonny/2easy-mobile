import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {getLessonCoverSource} from '../../../entities/lesson';
import {colors, radii} from '../../../shared/config/theme';

export type CatalogCardItem = {
  id: number;
  title?: string;
  tags?: string;
  image_path?: string;
};

type Props = {
  item: CatalogCardItem;
  onPress: () => void;
  onMenuPress?: () => void;
};

function KebabIcon() {
  return (
    <View style={styles.kebab} accessibilityElementsHidden>
      <View style={styles.kebabDot} />
      <View style={styles.kebabDot} />
      <View style={styles.kebabDot} />
    </View>
  );
}

export function LessonCard({item, onPress, onMenuPress}: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onMenuPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <Image
          source={getLessonCoverSource(item.image_path)}
          style={styles.image}
          resizeMode="cover"
        />
        {!!onMenuPress && (
          <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="More actions"
            style={({pressed}) => [
              styles.menuBtn,
              pressed && styles.menuBtnPressed,
            ]}>
            <KebabIcon />
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || `#${item.id}`}
        </Text>
        {!!item.tags && (
          <Text style={styles.tags} numberOfLines={1}>
            {item.tags}
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
  menuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(32,16,125,0.12)',
    shadowColor: '#20107D',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  menuBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  kebab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  kebabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
