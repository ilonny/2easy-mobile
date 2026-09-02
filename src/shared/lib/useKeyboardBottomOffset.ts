import {useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';

/**
 * Returns the on-screen keyboard height while it is visible.
 * Use as `marginBottom` on fixed bottom composers, or add to ScrollView
 * `paddingBottom` so focused inputs stay above the keyboard.
 */
export function useKeyboardBottomOffset(enabled = true): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [enabled]);

  return keyboardHeight;
}
