import {Platform, Vibration} from 'react-native';

/**
 * Light tactile feedback for button presses.
 * Uses the built-in Vibration API (no native haptic package required).
 */
export function hapticLight() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(12);
      return;
    }
    // iOS: short vibrate maps to a soft system feedback pulse
    Vibration.vibrate();
  } catch {
    // ignore — haptics are best-effort
  }
}

/** Slightly stronger pulse for confirm / drop / select actions. */
export function hapticSelection() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(18);
      return;
    }
    Vibration.vibrate();
  } catch {
    // ignore
  }
}
