import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {UseLessonTimer} from '../model/useLessonTimer';
import {LessonTimerSheet} from './LessonTimerSheet';
import {TimerRing} from './TimerRing';

type Props = {
  timer: UseLessonTimer;
};

/** Floating timer control over the lesson board WebView. */
export function BoardLessonTimerOverlay({timer}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const [open, setOpen] = useState(false);

  if (!timer.isTeacher && timer.isIdle) {
    return null;
  }

  const showRing =
    timer.state.status === 'running' ||
    timer.state.status === 'paused' ||
    timer.state.status === 'finished';

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          {
            bottom: Math.max(insets.bottom, 12) + 8,
            right: Math.max(insets.right, 12),
          },
        ]}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('lessons.timer.title')}
          style={({pressed}) => [
            styles.fab,
            pressed && styles.pressed,
            timer.finishedPulse && styles.pulse,
          ]}>
          {showRing ? (
            <TimerRing
              progress={timer.progress}
              label={timer.display}
              size={44}
              active={timer.isActive}
              pulse={timer.finishedPulse}
            />
          ) : (
            <Text style={styles.emoji}>⏱</Text>
          )}
        </Pressable>
      </View>
      <LessonTimerSheet
        visible={open}
        timer={timer}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 30,
    elevation: 30,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  pressed: {opacity: 0.85},
  pulse: {opacity: 0.65},
  emoji: {fontSize: 22},
});
