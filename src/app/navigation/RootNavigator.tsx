import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';

import {useAuth} from '../../entities/session';
import {
  GlobalVideoCallOverlay,
  VideoCallProvider,
} from '../../features/video-call';
import {colors} from '../../shared/config/theme';
import {AppNavigator} from './AppNavigator';

export function RootNavigator() {
  const {authIsLoading} = useAuth();

  if (authIsLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return (
    <VideoCallProvider>
      <View style={styles.root}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <GlobalVideoCallOverlay />
      </View>
    </VideoCallProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageBackground,
  },
});
