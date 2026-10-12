import {StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {useLayout} from '../../../../shared/lib/layout';
import {landing} from './landingTheme';

type Props = {
  labelKey: string;
  titleKey: string;
  icon?: string;
};

export function LandingSectionHeading({labelKey, titleKey, icon}: Props) {
  const {t} = useI18n();
  const {isTablet} = useLayout();

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.label, isTablet && styles.labelTablet]}>
          {t(labelKey)}
        </Text>
      </View>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t(titleKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 550,
    alignSelf: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: landing.black,
    letterSpacing: -0.1,
  },
  labelTablet: {
    fontSize: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 28,
    color: landing.black,
    letterSpacing: -0.25,
  },
  titleTablet: {
    fontSize: 36,
    lineHeight: 40,
  },
});
