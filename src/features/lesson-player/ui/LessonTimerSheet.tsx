import {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {LESSON_TIMER_PRESETS_SEC} from '../lib/lessonTimerWs';
import type {UseLessonTimer} from '../model/useLessonTimer';
import {TimerRing} from './TimerRing';

type Props = {
  visible: boolean;
  timer: UseLessonTimer;
  onClose: () => void;
};

function presetLabel(sec: number) {
  if (sec % 60 === 0) return `${sec / 60}m`;
  return `${sec}s`;
}

export function LessonTimerSheet({visible, timer, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const [customMinutes, setCustomMinutes] = useState('5');
  const [customSeconds, setCustomSeconds] = useState('0');
  const {
    isTeacher,
    state,
    display,
    progress,
    finishedPulse,
    start,
    pause,
    resume,
    reset,
  } = timer;

  const onCustomStart = () => {
    const minutes = Math.floor(
      Number(String(customMinutes).replace(',', '.')) || 0,
    );
    const seconds = Math.floor(
      Number(String(customSeconds).replace(',', '.')) || 0,
    );
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return;
    if (minutes < 0 || seconds < 0 || seconds > 59) return;
    const sec = minutes * 60 + seconds;
    if (sec < 1 || sec > 60 * 60 * 3) return;
    start(sec);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: insets.bottom + 16}]}
          onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('lessons.timer.title')}</Text>

          <View style={styles.ringWrap}>
            <TimerRing
              progress={
                state.status === 'idle' || state.status === 'finished'
                  ? 0
                  : progress
              }
              label={state.status === 'idle' ? '00:00' : display}
              size={96}
              active={state.status === 'running' || state.status === 'paused'}
              pulse={finishedPulse || state.status === 'finished'}
            />
          </View>

          {!isTeacher && state.status === 'paused' ? (
            <Text style={styles.paused}>{t('lessons.timer.paused')}</Text>
          ) : null}

          {isTeacher &&
          (state.status === 'idle' || state.status === 'finished') ? (
            <View style={styles.controls}>
              <View style={styles.presets}>
                {LESSON_TIMER_PRESETS_SEC.map(sec => (
                  <Pressable
                    key={sec}
                    style={styles.preset}
                    onPress={() => start(sec)}>
                    <Text style={styles.presetText}>{presetLabel(sec)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customRow}>
                <TextInput
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="number-pad"
                  style={styles.input}
                  accessibilityLabel={t('lessons.timer.customMinutes')}
                />
                <Text style={styles.minLabel}>{t('lessons.timer.min')}</Text>
                <Text style={styles.sep}>:</Text>
                <TextInput
                  value={customSeconds}
                  onChangeText={setCustomSeconds}
                  keyboardType="number-pad"
                  style={styles.input}
                  accessibilityLabel={t('lessons.timer.customSeconds')}
                />
                <Text style={styles.minLabel}>{t('lessons.timer.sec')}</Text>
                <Pressable style={styles.primaryBtn} onPress={onCustomStart}>
                  <Text style={styles.primaryBtnText}>
                    {t('lessons.timer.start')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isTeacher &&
          (state.status === 'running' || state.status === 'paused') ? (
            <View style={styles.actionRow}>
              {state.status === 'running' ? (
                <Pressable style={styles.secondaryBtn} onPress={pause}>
                  <Text style={styles.secondaryBtnText}>
                    {t('lessons.timer.pause')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={resume}>
                  <Text style={styles.primaryBtnText}>
                    {t('lessons.timer.resume')}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.ghostBtn} onPress={reset}>
                <Text style={styles.ghostBtnText}>
                  {t('lessons.timer.reset')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.modalBackdrop,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMuted,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  paused: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  controls: {gap: 12, marginBottom: 8},
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  preset: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    minWidth: 48,
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
    color: colors.text,
    textAlign: 'center',
  },
  minLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sep: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  ghostBtn: {
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ghostBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
});
