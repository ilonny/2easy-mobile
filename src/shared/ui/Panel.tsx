import type {PropsWithChildren} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, spacing} from '../config/theme';
import {useLayout} from '../lib/layout';

export function Panel({children}: PropsWithChildren) {
  const {isTablet, authFormMaxWidth} = useLayout();

  return (
    <View
      style={[
        styles.panel,
        {maxWidth: authFormMaxWidth},
        isTablet && styles.panelTablet,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.panel,
    width: '100%',
    alignSelf: 'center',
  },
  panelTablet: {
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
});
