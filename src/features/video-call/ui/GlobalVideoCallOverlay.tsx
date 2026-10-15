import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {LessonVideoCallWindow} from '../../lesson-player/ui/LessonVideoCallWindow';
import {useVideoCall} from '../model/VideoCallContext';

/**
 * App-scoped floating video call. Renders above the navigator so the WebView
 * survives screen / tab changes while the call is open.
 */
export function GlobalVideoCallOverlay() {
  const insets = useSafeAreaInsets();
  const {isOpen, lessonOwnerId, close} = useVideoCall();

  if (!isOpen) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <LessonVideoCallWindow
        visible
        lessonOwnerId={lessonOwnerId}
        bottomOffset={Math.max(insets.bottom, 10) + 16}
        onClose={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
});
