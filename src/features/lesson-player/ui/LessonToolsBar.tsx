import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {TimerRing} from './TimerRing';

export const LESSON_TOOLS_BAR_HEIGHT = 72;

type Props = {
  showParticipants?: boolean;
  showDictionary?: boolean;
  showBoard?: boolean;
  showTimer?: boolean;
  participantsCount?: number;
  timerLabel?: string;
  timerActive?: boolean;
  timerPulse?: boolean;
  onParticipants?: () => void;
  onChat: () => void;
  onTimer?: () => void;
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
  customIcon,
}: {
  label: string;
  emoji?: string;
  onPress: () => void;
  badge?: number;
  customIcon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={[styles.iconWrap, customIcon ? styles.iconWrapPlain : null]}>
        {customIcon ?? <Text style={styles.emoji}>{emoji}</Text>}
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
  showTimer,
  participantsCount,
  timerLabel,
  timerActive,
  timerPulse,
  onParticipants,
  onChat,
  onTimer,
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
        {showTimer && onTimer ? (
          <ToolButton
            label={
              timerActive || timerPulse
                ? timerLabel || t('lessons.timer.short')
                : t('lessons.timer.short')
            }
            emoji="⏱"
            onPress={onTimer}
            customIcon={
              timerActive || timerPulse ? (
                <TimerRing
                  progress={1}
                  label={timerLabel || '00:00'}
                  size={36}
                  active={!!timerActive}
                  pulse={!!timerPulse}
                />
              ) : undefined
            }
          />
        ) : null}
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
  iconWrapPlain: {
    backgroundColor: 'transparent',
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
