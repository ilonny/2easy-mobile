import type {PropsWithChildren} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AuthProvider} from '../../entities/session';
import {I18nProvider, useI18n} from '../../shared/i18n';
import {colors} from '../../shared/config/theme';
import {RootNavigator} from '../navigation';

function AppShell({children}: PropsWithChildren) {
  const {ready} = useI18n();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
}

export function AppProviders({children}: PropsWithChildren) {
  return (
    <I18nProvider>
      <AppShell>{children}</AppShell>
    </I18nProvider>
  );
}

export function AppRoot() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.flex}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F5FF" />
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryHover,
  },
});
