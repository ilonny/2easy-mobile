import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {AppHeader} from '../../app-shell';

export function HomeHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, {paddingTop: insets.top + 8}]}>
      <AppHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
});
