import {ActivityIndicator, Image, Pressable, StyleSheet, Text, View} from 'react-native';

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
  locked?: boolean;
  /** Optional secondary action (e.g. Homework / Create homework). */
  actionLabel?: string;
  onActionPress?: () => void;
  actionLoading?: boolean;
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

export function LessonCard({
  item,
  onPress,
  onMenuPress,
  locked,
  actionLabel,
  onActionPress,
  actionLoading,
}: Props) {
  return (
    <View style={styles.wrap}>
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
          {locked ? (
            <View style={styles.lockOverlay} pointerEvents="none">
              <View style={styles.lockBadge}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            </View>
          ) : null}
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
      {!!actionLabel && !!onActionPress ? (
        <Pressable
          onPress={onActionPress}
          disabled={actionLoading || locked}
          style={({pressed}) => [
            styles.actionBtn,
            (pressed || actionLoading) && styles.actionBtnPressed,
            locked && styles.actionBtnDisabled,
          ]}>
          {actionLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.actionText} numberOfLines={1}>
              {actionLabel}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {width: '100%'},
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 22,
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
  actionBtn: {
    marginTop: 8,
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionBtnPressed: {opacity: 0.85, backgroundColor: colors.primarySoft},
  actionBtnDisabled: {opacity: 0.45},
  actionText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
