import {type ReactNode, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {hapticLight} from '../../../../shared/lib/haptics';

type Props = {
  /** Correct-answer text for the teacher (site tooltip content). */
  hint?: string;
  enabled?: boolean;
  children: ReactNode;
};

/**
 * Site-parity teacher hint without blocking child gestures (input / drag).
 * Tap the "?" badge to reveal the correct answer (website: ResponsiveTooltip).
 *
 * Bubble is rendered in normal layout flow under the gap — absolute
 * `bottom: '100%'` jumps far away inside flexWrap rows on RN.
 */
export function TeacherAnswerHint({hint, enabled, children}: Props) {
  const [open, setOpen] = useState(false);
  const show = !!enabled && !!(hint || '').trim();

  if (!show) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.slot}>
        {children}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Correct answer: ${hint}`}
          hitSlop={8}
          onPress={() => {
            hapticLight();
            setOpen(v => !v);
          }}
          style={styles.badge}>
          <Text style={styles.badgeText}>?</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '100%',
    gap: 4,
  },
  slot: {
    position: 'relative',
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '100%',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: 260,
    backgroundColor: '#1F2937',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
});
