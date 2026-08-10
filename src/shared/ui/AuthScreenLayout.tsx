import type {PropsWithChildren} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors, spacing} from '../config/theme';
import {useLayout} from '../lib/layout';
import {Panel} from './Panel';

export function AuthScreenLayout({children}: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const {isTablet, isLandscape, authFormMaxWidth, pageGutter} = useLayout();

  return (
    <View style={[styles.root, {paddingTop: insets.top + (isTablet ? 24 : 12)}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: pageGutter,
              justifyContent: isTablet && !isLandscape ? 'center' : 'flex-start',
              flexGrow: 1,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.column, {maxWidth: authFormMaxWidth}]}>
            <View style={[styles.logoCard, isTablet && styles.logoCardTablet]}>
              <Image
                source={require('../assets/logo.png')}
                style={[styles.logo, isTablet && styles.logoTablet]}
                resizeMode="contain"
              />
            </View>
            <Panel>{children}</Panel>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    gap: spacing.lg,
  },
  logoCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  logoCardTablet: {
    paddingVertical: 24,
    borderRadius: 12,
  },
  logo: {
    width: 180,
    height: 84,
  },
  logoTablet: {
    width: 220,
    height: 102,
  },
});
