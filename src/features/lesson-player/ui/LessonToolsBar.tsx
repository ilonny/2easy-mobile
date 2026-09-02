import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';

export const LESSON_TOOLS_BAR_HEIGHT = 72;

type Props = {
  showParticipants?: boolean;
  showDictionary?: boolean;
  showBoard?: boolean;
  participantsCount?: number;
  onParticipants?: () => void;
  onChat: () => void;
  onVideo: () => void;
  onDictionary?: () => void;
  onBoard?: () => void;
  boardLoading?: boolean;
};

function ToolButton({
  label,
  emoji,
  onPress,
  badge,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={styles.iconWrap}>
        <Text style={styles.emoji}>{emoji}</Text>
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LessonToolsBar({
  showParticipants,
  showDictionary,
  showBoard,
  participantsCount,
  onParticipants,
  onChat,
  onVideo,
  onDictionary,
  onBoard,
  boardLoading,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: pageGutter,
        },
      ]}>
      <View style={[styles.inner, {maxWidth: pageContentMaxWidth}]}>
        {showParticipants && onParticipants ? (
          <ToolButton
            emoji="👥"
            label={t('lessons.participantsShort')}
            badge={participantsCount}
            onPress={onParticipants}
          />
        ) : null}
        <ToolButton
          emoji="💬"
          label={t('lessons.chatShort')}
          onPress={onChat}
        />
        <ToolButton
          emoji="📹"
          label={t('videoCall.short')}
          onPress={onVideo}
        />
        {showDictionary && onDictionary ? (
          <ToolButton
            emoji="📖"
            label={t('dictionary.tab')}
            onPress={onDictionary}
          />
        ) : null}
        {showBoard && onBoard ? (
          <ToolButton
            emoji="📋"
            label={t('boards.lessonBoard')}
            onPress={onBoard}
            badge={boardLoading ? undefined : undefined}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  btnPressed: {opacity: 0.75, backgroundColor: colors.primarySoft},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {fontSize: 18},
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {color: colors.white, fontSize: 10, fontWeight: '800'},
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
