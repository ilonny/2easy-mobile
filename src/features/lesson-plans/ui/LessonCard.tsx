import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {GestureDetector, type GestureType} from 'react-native-gesture-handler';

import {getLessonCoverSource} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {SmartImage} from '../../../shared/ui';

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
  /** When false, long-press does not open the menu (e.g. drag-reorder). Default true. */
  menuOnLongPress?: boolean;
  /**
   * Gesture on the ↔️ handle for drag-reorder (site-style).
   * When set, the whole card is not a drag target.
   */
  dragHandleGesture?: GestureType;
  locked?: boolean;
  isFolder?: boolean;
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
  menuOnLongPress = true,
  dragHandleGesture,
  locked,
  isFolder,
  actionLabel,
  onActionPress,
  actionLoading,
}: Props) {
  const {t} = useI18n();
  const title = item.title || `#${item.id}`;
  const handleNode = (
    <View
      accessibilityRole="button"
      accessibilityLabel={t('lessons.dragHandle')}
      style={styles.dragHandle}>
      <Text style={styles.dragHandleIcon}>↔️</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, styles.cardPress]}>
        <View style={styles.imageWrap}>
          <Pressable
            onPress={onPress}
            onLongPress={
              dragHandleGesture
                ? undefined
                : menuOnLongPress
                  ? onMenuPress
                  : undefined
            }
            style={({pressed}) => [
              styles.imagePress,
              pressed && styles.pressed,
            ]}>
            <SmartImage
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
            {isFolder ? (
              <View style={styles.folderBadge} pointerEvents="none">
                <Text style={styles.folderBadgeText}>📁</Text>
              </View>
            ) : null}
          </Pressable>
          {!!onMenuPress && (
            <Pressable
              onPress={onMenuPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="More actions"
              style={({pressed}) => [
                styles.menuBtn,
                isFolder && styles.menuBtnFolder,
                pressed && styles.menuBtnPressed,
              ]}>
              <KebabIcon />
            </Pressable>
          )}
          {/* Sibling of Pressable so RNGH long-press + pan is not stolen. */}
          {dragHandleGesture ? (
            <GestureDetector gesture={dragHandleGesture}>
              {handleNode}
            </GestureDetector>
          ) : null}
        </View>
        <Pressable
          onPress={onPress}
          style={({pressed}) => [pressed && styles.pressed]}>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {isFolder
                ? t('lessons.folderTitlePrefix').replace('{{title}}', title)
                : title}
            </Text>
            {!!item.tags && (
              <Text style={styles.tags} numberOfLines={1}>
                {item.tags}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
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
  cardPress: {
    width: '100%',
  },
  imagePress: {
    ...StyleSheet.absoluteFill,
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
  menuBtnFolder: {
    left: 8,
    right: undefined,
  },
  menuBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  folderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBadgeText: {
    fontSize: 16,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 16, 125, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dragHandleIcon: {
    fontSize: 16,
    color: colors.white,
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
