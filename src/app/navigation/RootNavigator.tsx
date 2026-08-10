import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';

import {useAuth} from '../../entities/session';
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
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageBackground,
  },
});
